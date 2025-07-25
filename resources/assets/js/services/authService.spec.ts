import UnitTestCase from '@/__tests__/UnitTestCase'
import { expect, it } from 'vitest'
import factory from '@/__tests__/factory'
import type { UpdateCurrentProfileData } from '@/services/authService'
import { authService } from '@/services/authService'
import { http } from '@/services/http'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { userStore } from '@/stores/userStore'

const originalLocation = window.location

new class extends UnitTestCase {
  protected beforeEach () {
    super.beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
        },
        writable: true,
      })
    })
  }

  protected afterEach () {
    super.afterEach(() => {
      window.location = originalLocation // @ts-expect-error
      useLocalStorage(false).remove('redirect')
    })
  }

  protected test () {
    const { get: lsGet, set: lsSet } = useLocalStorage(false)

    it('gets the token', () => {
      lsSet('api-token', 'foo')
      expect(authService.getApiToken()).toBe('foo')
    })

    it.each([['foo', true], [null, false]])('checks if the token exists', (token, exists) => {
      lsSet('api-token', token)
      expect(authService.hasApiToken()).toBe(exists)
    })

    it('sets the token', () => {
      authService.setApiToken('foo')
      expect(lsGet('api-token')).toBe('foo')
    })

    it('destroys the token', () => {
      lsSet('api-token', 'foo')
      authService.destroy()
      expect(lsGet('api-token')).toBeNull()
    })

    it('logs in', async () => {
      const postMock = this.mock(http, 'post').mockResolvedValue({
        'audio-token': 'foo',
        'token': 'bar',
      })

      await authService.login('john@doe.com', 'curry-wurst')

      expect(postMock).toHaveBeenCalledWith('me', { email: 'john@doe.com', password: 'curry-wurst' })
    })

    it('redirects after login', async () => {
      const redirectMock = this.mock(authService, 'maybeRedirect')
      lsSet('redirect', 'http://localhost:3000/foo/bar')

      this.mock(http, 'post').mockResolvedValue({
        'audio-token': 'foo',
        'token': 'bar',
      })

      await authService.login('john@doe.com', 'curry-wurst')

      expect(redirectMock).toHaveBeenCalled()
    })

    it('logs out', async () => {
      const deleteMock = this.mock(http, 'delete')
      await authService.logout()

      expect(deleteMock).toHaveBeenCalledWith('me')
    })

    it('gets profile', async () => {
      const getMock = this.mock(http, 'get')
      await authService.getProfile()

      expect(getMock).toHaveBeenCalledWith('me')
    })

    it('updates profile', async () => {
      userStore.state.current = factory('user', {
        name: 'John Doe',
        email: 'john@doe.com',
      })

      const updated = factory('user', {
        name: 'Jane Doe',
        email: 'jane@doe.com',
      })

      const putMock = this.mock(http, 'put').mockResolvedValue(updated)

      const data: UpdateCurrentProfileData = {
        current_password: 'curry-wurst',
        name: 'Jane Doe',
        email: 'jane@doe.com',
      }

      await authService.updateProfile(data)

      expect(putMock).toHaveBeenCalledWith('me', data)
      expect(userStore.current.name).toBe('Jane Doe')
      expect(userStore.current.email).toBe('jane@doe.com')
    })

    it('sets redirect url', () => {
      authService.setRedirect('/foo/bar')
      expect(lsGet('redirect')).toBe('/foo/bar')
    })

    it('sets redirect url to the current URL', () => {
      this.mock(location, 'toString').mockReturnValue('http://localhost:3000/foo/bar')
      authService.setRedirect()
      expect(lsGet('redirect')).toBe('http://localhost:3000/foo/bar')
    })

    it('checks if redirect url exists', () => {
      lsSet('redirect', 'http://localhost:3000/foo/bar')
      expect(authService.hasRedirect()).toBe(true)
    })

    it('redirects to the stored URL', () => {
      const assignMock = this.mock(location, 'assign')
      lsSet('redirect', 'http://localhost:3000/foo/bar')

      authService.maybeRedirect()

      expect(assignMock).toHaveBeenCalledWith('http://localhost:3000/foo/bar')
      expect(lsGet('redirect')).toBeNull()
    })

    it('does not redirect if no redirect url is stored', () => {
      const assignMock = this.mock(location, 'assign')
      expect(lsGet('redirect')).toBeNull()

      authService.maybeRedirect()

      expect(assignMock).not.toHaveBeenCalled()
      expect(lsGet('redirect')).toBeNull()
    })
  }
}
