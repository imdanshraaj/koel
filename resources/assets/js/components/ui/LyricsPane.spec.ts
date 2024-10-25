import { expect, it } from 'vitest'
import { screen } from '@testing-library/vue'
import UnitTestCase from '@/__tests__/UnitTestCase'
import factory from '@/__tests__/factory'
import { eventBus } from '@/utils/eventBus'
import LyricsPane from './LyricsPane.vue'
import Magnifier from '@/components/ui/Magnifier.vue'

new class extends UnitTestCase {
  protected test () {
    it('renders', () => expect(this.renderComponent().html()).toMatchSnapshot())

    it('provides a button to add lyrics if current user is admin', async () => {
      const song = factory('song', { lyrics: null })

      const mock = this.mock(eventBus, 'emit')
      this.beAdmin().renderComponent(song)

      await this.user.click(screen.getByRole('button', { name: 'Click here' }))

      expect(mock).toHaveBeenCalledWith('MODAL_SHOW_EDIT_SONG_FORM', song, 'lyrics')
    })

    it('does not have a button to add lyrics if current user is not an admin', async () => {
      this.be().renderComponent(factory('song', { lyrics: null }))
      expect(screen.queryByRole('button', { name: 'Click here' })).toBeNull()
    })
  }

  private renderComponent (song?: Song) {
    song = song || factory('song', {
      lyrics: 'Foo bar baz qux',
    })

    return this.render(LyricsPane, {
      props: {
        song,
      },
      global: {
        stubs: {
          Magnifier,
        },
      },
    })
  }
}
