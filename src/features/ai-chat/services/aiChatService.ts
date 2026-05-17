import { mockAdapter } from '@/lib/api/mockAdapter'
import { apiClient } from '@/lib/api/apiClient'
import { endpoints } from '@/lib/api/endpoints'
import { getAppSettings, shouldUseApi } from '@/lib/api/config'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage/localStorage'
import { normalizeSearchText, uid } from '@/lib/utils'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import type {
  ChatMensaje,
  ChatSesion,
  ConsultaRAG,
  LlmConnectionStatus,
} from '@/types/chat'

const normalizeConnectionStatus = (
  payload: Partial<LlmConnectionStatus> &
    Pick<LlmConnectionStatus, 'connected' | 'availableModels' | 'message'>,
): LlmConnectionStatus => ({
  connected: payload.connected,
  reachable: payload.reachable ?? payload.connected,
  provider: payload.provider,
  baseUrl: payload.baseUrl,
  availableModels: payload.availableModels ?? [],
  resolvedModel: payload.resolvedModel,
  issues: payload.issues ?? [],
  nextSteps: payload.nextSteps ?? [],
  message: payload.message,
})

export const aiChatService = {
  listSessions(studentId: string) {
    if (shouldUseApi()) {
      return apiClient.get<ChatSesion[]>(
        `${endpoints.chatSessions}?student_id=${studentId}`,
      )
    }
    return mockAdapter(() =>
      readStorage<ChatSesion[]>(STORAGE_KEYS.chatSessions, []).filter(
        (session) => session.estudianteId === studentId,
      ),
    )
  },
  createSession(studentId: string, title = 'Nueva conversación académica') {
    if (shouldUseApi()) {
      return apiClient.post<
        { estudianteId: string; titulo: string },
        ChatSesion
      >(endpoints.chatSessions, {
        estudianteId: studentId,
        titulo: title,
      })
    }
    return mockAdapter(() => {
      const session: ChatSesion = {
        id: uid('chat'),
        estudianteId: studentId,
        titulo: title,
        fechaInicio: new Date().toISOString(),
      }
      writeStorage(STORAGE_KEYS.chatSessions, [
        ...readStorage<ChatSesion[]>(STORAGE_KEYS.chatSessions, []),
        session,
      ])
      return session
    })
  },
  getMessages(sessionId: string) {
    if (shouldUseApi()) {
      return apiClient.get<ChatMensaje[]>(endpoints.chatMessages(sessionId))
    }
    return mockAdapter(() =>
      readStorage<ChatMensaje[]>(STORAGE_KEYS.chatMessages, []).filter(
        (message) => message.chatSesionId === sessionId,
      ),
    )
  },
  getRagQueries(sessionId: string) {
    if (shouldUseApi()) {
      return apiClient.get<ConsultaRAG[]>(endpoints.chatRagQueries(sessionId))
    }
    return mockAdapter(() => {
      const messageIds = new Set(
        readStorage<ChatMensaje[]>(STORAGE_KEYS.chatMessages, [])
          .filter((message) => message.chatSesionId === sessionId)
          .map((message) => message.id),
      )
      return readStorage<ConsultaRAG[]>(STORAGE_KEYS.ragQueries, []).filter(
        (query) => messageIds.has(query.chatMensajeId),
      )
    })
  },
  async retrieveContext(studentId: string, question: string) {
    if (shouldUseApi()) {
      return apiClient.post<
        { studentId: string; pregunta: string },
        { contexto: string; fuentes: string[] }
      >(endpoints.ragRetrieve, { studentId, pregunta: question })
    }
    const primaryProgramId = await curriculumService.getPrimaryProgramId(studentId)
    const available = await curriculumService.getAvailableNextSemester(
      studentId,
      primaryProgramId,
    )
    const normalizedQuestion = normalizeSearchText(question)
    return mockAdapter(() => ({
      contexto:
        normalizedQuestion.includes('proximo semestre')
          ? `Materias disponibles: ${available.map((item) => item.codigo).join(', ')}.`
          : 'Se consultó grafo curricular, historial académico y escenarios guardados.',
      fuentes: [
        'grafo curricular',
        'historial académico',
        'escenario guardado',
        'documento PDF procesado',
      ],
    }))
  },
  async generateMockAnswer(studentId: string, question: string) {
    if (shouldUseApi()) {
      const settings = getAppSettings()
      const llmPayload = settings.llmConnected
        ? {
            endpoint: settings.llmEndpoint,
            model: settings.llmModel,
          }
        : {}
      const response = await apiClient.post<
        {
          studentId: string
          pregunta: string
          endpoint?: string
          model?: string
        },
        {
          respuesta: string
          modeloLocal: ConsultaRAG['modeloLocal']
          generationMode: 'local_llm' | 'mock_fallback'
          resolvedModel?: string
        }
      >(endpoints.llmGenerate, {
        studentId,
        pregunta: question,
        ...llmPayload,
      })
      return response.respuesta
    }
    const primaryProgramId = await curriculumService.getPrimaryProgramId(studentId)
    const summary = await curriculumService.getProgressSummary(studentId, primaryProgramId)
    const available = await curriculumService.getAvailableNextSemester(
      studentId,
      primaryProgramId,
    )
    const normalizedQuestion = normalizeSearchText(question)
    if (normalizedQuestion.includes('proximo semestre')) {
      return `Con base en tu historial académico, puedes cursar ${available
        .slice(0, 4)
        .map((course) => course.nombre)
        .join(', ')}. La recomendación sale del grafo curricular y de tus prerrequisitos aprobados.`
    }
    if (normalizedQuestion.includes('creditos')) {
      return `Te faltan ${summary.totalCreditos - summary.creditosAprobados} créditos para completar el programa principal.`
    }
    if (normalizedQuestion.includes('bases de datos')) {
      return 'Bases de Datos requiere haber aprobado Estructuras de Datos. En tu estado actual, aún no aparece disponible.'
    }
    if (normalizedQuestion.includes('calculo ii')) {
      return 'Si pierdes Cálculo Integral, se afecta directamente Probabilidad y Estadística y puede retrasarse tu secuencia matemática un semestre.'
    }
    return 'Con la información académica disponible, la ruta balanceada parece la más conveniente porque mantiene avance sin concentrar demasiados créditos.'
  },
  async sendMessage(sessionId: string, studentId: string, message: string) {
    if (shouldUseApi()) {
      const settings = getAppSettings()
      const llmPayload = settings.llmConnected
        ? {
            endpoint: settings.llmEndpoint,
            model: settings.llmModel,
          }
        : {}
      return apiClient.post<
        { mensaje: string; endpoint?: string; model?: string },
        {
          userMessage: ChatMensaje
          assistantMessage: ChatMensaje
          ragQuery: ConsultaRAG
        }
      >(endpoints.chatMessages(sessionId), {
        mensaje: message,
        ...llmPayload,
      })
    }
    const currentMessages = readStorage<ChatMensaje[]>(STORAGE_KEYS.chatMessages, [])
    const userMessage: ChatMensaje = {
      id: uid('msg'),
      chatSesionId: sessionId,
      emisor: 'usuario',
      mensaje: message,
      fecha: new Date().toISOString(),
    }
    const context = await aiChatService.retrieveContext(studentId, message)
    const answer = await aiChatService.generateMockAnswer(studentId, message)
    const assistantMessage: ChatMensaje = {
      id: uid('msg'),
      chatSesionId: sessionId,
      emisor: 'asistente',
      mensaje: answer,
      fecha: new Date().toISOString(),
      fuentesOpcionales: context.fuentes,
    }
    const ragQuery: ConsultaRAG = {
      id: uid('rag'),
      chatMensajeId: assistantMessage.id,
      pregunta: message,
      contextoRecuperado: context.contexto,
      fuentesConsultadas: context.fuentes,
      modeloLocal: 'gemma',
    }
    writeStorage(STORAGE_KEYS.chatMessages, [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ])
    writeStorage(STORAGE_KEYS.ragQueries, [
      ...readStorage<ConsultaRAG[]>(STORAGE_KEYS.ragQueries, []),
      ragQuery,
    ])
    return mockAdapter(() => ({ userMessage, assistantMessage, ragQuery }), {
      delay: 420,
    })
  },
  async connectToLocalLLM(endpoint?: string, model?: string) {
    if (shouldUseApi()) {
      const result = await apiClient.post<
        { endpoint: string; model: string },
        Partial<LlmConnectionStatus> &
          Pick<LlmConnectionStatus, 'connected' | 'availableModels' | 'message'>
      >(endpoints.llmConnect, {
        endpoint: endpoint ?? 'http://localhost:11434',
        model: model ?? 'gemma3',
      })
      return normalizeConnectionStatus(result)
    }
    return mockAdapter(() => normalizeConnectionStatus({
      connected: false,
      reachable: false,
      availableModels: [],
      issues: ['No hay servidor local conectado en modo mock.'],
      nextSteps: ['Configura un endpoint local para validar Gemma, Llama o Mistral.'],
      message:
        'Placeholder listo: aquí se conectará Gemma, Llama, Mistral u otro modelo local.',
    }))
  },
}
