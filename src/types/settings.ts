export interface AppSettings {
  theme: 'light' | 'dark'
  apiBaseUrl: string
  dataSource: 'mock' | 'api'
  llmProvider: string
  llmModel: string
  llmEndpoint: string
  llmConnected: boolean
  maxCredits: number
}
