/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEFAULT_DATA_SOURCE?: 'api' | 'mock'
  readonly VITE_DEFAULT_THEME?: 'light' | 'dark'
  readonly VITE_DEFAULT_MAX_CREDITS?: string
  readonly VITE_LLM_PROVIDER?: string
  readonly VITE_LLM_MODEL?: string
  readonly VITE_LLM_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
