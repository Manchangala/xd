export interface ChatSesion {
  id: string
  estudianteId: string
  titulo: string
  fechaInicio: string
}

export interface ChatMensaje {
  id: string
  chatSesionId: string
  emisor: 'usuario' | 'asistente'
  mensaje: string
  fecha: string
  fuentesOpcionales?: string[]
}

export interface ConsultaRAG {
  id: string
  chatMensajeId: string
  pregunta: string
  contextoRecuperado: string
  fuentesConsultadas: string[]
  modeloLocal: 'gemma' | 'llama' | 'mistral' | 'otro'
}

export interface LlmConnectionStatus {
  connected: boolean
  reachable: boolean
  provider?: string | null
  baseUrl?: string | null
  availableModels: string[]
  resolvedModel?: string
  issues: string[]
  nextSteps: string[]
  message: string
}
