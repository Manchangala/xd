import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage/localStorage'
import type { AppSettings } from '@/types/settings'

const readEnvString = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback

const readEnvNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const readEnvDataSource = (
  value: ImportMetaEnv['VITE_DEFAULT_DATA_SOURCE'],
): AppSettings['dataSource'] => (value === 'api' ? 'api' : 'mock')

const readEnvTheme = (
  value: ImportMetaEnv['VITE_DEFAULT_THEME'],
): AppSettings['theme'] => (value === 'dark' ? 'dark' : 'light')

export const defaultSettings: AppSettings = {
  theme: readEnvTheme(import.meta.env.VITE_DEFAULT_THEME),
  apiBaseUrl: readEnvString(
    import.meta.env.VITE_API_BASE_URL,
    'http://127.0.0.1:8000/api/v1',
  ),
  dataSource: readEnvDataSource(import.meta.env.VITE_DEFAULT_DATA_SOURCE),
  llmProvider: readEnvString(import.meta.env.VITE_LLM_PROVIDER, 'local'),
  llmModel: readEnvString(import.meta.env.VITE_LLM_MODEL, 'gemma'),
  llmEndpoint: readEnvString(
    import.meta.env.VITE_LLM_ENDPOINT,
    'http://localhost:11434',
  ),
  llmConnected: false,
  maxCredits: readEnvNumber(import.meta.env.VITE_DEFAULT_MAX_CREDITS, 20),
}

export const getAppSettings = (): AppSettings => {
  const stored = readStorage<Partial<AppSettings>>(STORAGE_KEYS.settings, {})
  const legacyPlaceholderUrl = 'http://localhost:4000/api'
  return {
    ...defaultSettings,
    ...stored,
    apiBaseUrl:
      stored.apiBaseUrl === legacyPlaceholderUrl || !stored.apiBaseUrl
        ? defaultSettings.apiBaseUrl
        : stored.apiBaseUrl,
  }
}

export const shouldUseApi = () => getAppSettings().dataSource === 'api'

export const isApiNetworkError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return (
    error instanceof TypeError ||
    /failed to fetch|networkerror|load failed|network request failed|servidor remoto|connection refused/i.test(
      message,
    )
  )
}

export const switchToMockDataSource = () => {
  writeStorage(STORAGE_KEYS.settings, {
    ...getAppSettings(),
    dataSource: 'mock',
  })
}
