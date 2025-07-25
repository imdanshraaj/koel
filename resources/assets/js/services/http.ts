import type { AxiosInstance, Method } from 'axios'
import Axios from 'axios'
import NProgress from 'nprogress'
import { authService } from '@/services/authService'
import { eventBus } from '@/utils/eventBus'

class Http {
  client: AxiosInstance

  private silent = false

  constructor () {
    this.client = Axios.create({
      baseURL: `${window.BASE_URL}api`,
      headers: {
        'X-Api-Version': 'v6',
      },
    })

    // Intercept the request to make sure the token is injected into the header.
    this.client.interceptors.request.use(config => {
      this.silent || this.showLoadingIndicator()
      config.headers.Authorization = `Bearer ${authService.getApiToken()}`
      return config
    })

    // Intercept the response and…
    this.client.interceptors.response.use(response => {
      this.silent || this.hideLoadingIndicator()
      this.silent = false

      // …get the tokens from the header if exists, and save them
      // This occurs during user updating password.
      const token = response.headers.authorization
      token && authService.setApiToken(token)

      return response
    }, error => {
      this.silent || this.hideLoadingIndicator()
      this.silent = false

      // Also, if we receive a Bad Request / Unauthorized error
      if (error.response?.status === 400 || error.response?.status === 401) {
        // and we're not trying to log in
        if (!(error.config.method === 'post' && error.config.url === 'me')) {
          // the token must have expired.
          // store the attempted URL so we can redirect the user to it after login.
          authService.setRedirect()
          eventBus.emit('LOG_OUT')
        }
      }

      return Promise.reject(error)
    })
  }

  public get silently () {
    this.silent = true
    return this
  }

  public request<T> (method: Method, url: string, data: Record<string, any> = {}, onUploadProgress?: any) {
    return this.client.request({
      url,
      data,
      method,
      onUploadProgress,
    }) as Promise<{ data: T }>
  }

  public async get<T> (url: string) {
    return (await this.request<T>('get', url)).data
  }

  public async post<T> (url: string, data: Record<string, any> = {}, onUploadProgress?: any) {
    return (await this.request<T>('post', url, data, onUploadProgress)).data
  }

  public async put<T> (url: string, data: Record<string, any>) {
    return (await this.request<T>('put', url, data)).data
  }

  public async patch<T> (url: string, data: Record<string, any>) {
    return (await this.request<T>('patch', url, data)).data
  }

  public async delete<T> (url: string, data: Record<string, any> = {}) {
    return (await this.request<T>('delete', url, data)).data
  }

  private showLoadingIndicator () {
    NProgress.start()
  }

  private hideLoadingIndicator () {
    NProgress.done(true)
  }
}

export const http = new Http()
