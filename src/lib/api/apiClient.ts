import { STORAGE_KEYS } from '@/lib/constants'
import { getAppSettings } from '@/lib/api/config'
import { readStorage } from '@/lib/storage/localStorage'
import type { AuthSession } from '@/types/auth'

export interface ApiClient {
  get<T>(url: string): Promise<T>
  post<TPayload, TResponse>(url: string, payload: TPayload): Promise<TResponse>
  postForm<TResponse>(url: string, payload: FormData): Promise<TResponse>
  patch<TPayload, TResponse>(url: string, payload: TPayload): Promise<TResponse>
  delete<TResponse>(url: string): Promise<TResponse>
}

const getAuthToken = () =>
  readStorage<AuthSession | null>(STORAGE_KEYS.auth, null)?.accessToken

const buildUrl = (url: string) => {
  const baseUrl = getAppSettings().apiBaseUrl.replace(/\/$/, '')
  return `${baseUrl}${url}`
}

const request = async <T,>(
  url: string,
  init?: RequestInit,
): Promise<T> => {
  const token = getAuthToken()
  const response = await fetch(buildUrl(url), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : {
            'Content-Type': 'application/json',
          }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const detail = payload?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message ?? `La API respondió con estado ${response.status}`
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const apiClient: ApiClient = {
  get<T>(url: string) {
    return request<T>(url)
  },
  post<TPayload, TResponse>(url: string, payload: TPayload) {
    return request<TResponse>(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  postForm<TResponse>(url: string, payload: FormData) {
    return request<TResponse>(url, {
      method: 'POST',
      body: payload,
    })
  },
  patch<TPayload, TResponse>(url: string, payload: TPayload) {
    return request<TResponse>(url, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  delete<TResponse>(url: string) {
    return request<TResponse>(url, {
      method: 'DELETE',
    })
  },
}
