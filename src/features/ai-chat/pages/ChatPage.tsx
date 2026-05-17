import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page'
import { aiChatService } from '@/features/ai-chat/services/aiChatService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { getAppSettings } from '@/lib/api/config'

const quickQuestions = [
  '¿Qué materias puedo cursar el próximo semestre?',
  '¿Qué pasa si pierdo Cálculo II?',
  '¿Cuántos créditos me faltan?',
  '¿Puedo tomar Bases de Datos?',
  '¿Cuál ruta me conviene?',
]

const formatModelLabel = (model: string) =>
  model === 'otro' ? 'Modelo local' : `${model.charAt(0).toUpperCase()}${model.slice(1)}`

export function ChatPage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const settings = getAppSettings()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [requestedSessionId, setRequestedSessionId] = useState('')
  const sessions = useQuery({
    queryKey: ['chat-sessions', studentId],
    queryFn: () => aiChatService.listSessions(studentId),
  })
  const createSession = useMutation({
    mutationFn: () =>
      aiChatService.createSession(studentId, 'Consulta académica principal'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', studentId] })
    },
  })
  const selectedSessionId = useMemo(() => {
    const items = sessions.data ?? []
    if (items.some((session) => session.id === requestedSessionId)) {
      return requestedSessionId
    }
    return items[0]?.id ?? createSession.data?.id ?? ''
  }, [createSession.data?.id, requestedSessionId, sessions.data])
  const messages = useQuery({
    queryKey: ['chat-messages', selectedSessionId],
    queryFn: () => aiChatService.getMessages(selectedSessionId),
    enabled: Boolean(selectedSessionId),
    initialData: [],
  })
  const ragQueries = useQuery({
    queryKey: ['rag-queries', selectedSessionId],
    queryFn: () => aiChatService.getRagQueries(selectedSessionId),
    enabled: Boolean(selectedSessionId),
    initialData: [],
  })
  const send = useMutation({
    mutationFn: (text: string) => aiChatService.sendMessage(selectedSessionId, studentId, text),
    onSuccess: (_response, submittedText) => {
      setMessage((currentMessage) =>
        currentMessage === submittedText ? '' : currentMessage,
      )
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedSessionId] })
      queryClient.invalidateQueries({ queryKey: ['rag-queries', selectedSessionId] })
    },
  })

  const latestAssistant = useMemo(
    () => messages.data?.filter((item) => item.emisor === 'asistente').at(-1),
    [messages.data],
  )
  const latestRagQuery = useMemo(
    () => ragQueries.data?.at(-1),
    [ragQueries.data],
  )

  useEffect(() => {
    if (!sessions.data) return
    if (
      sessions.data.length === 0 &&
      !createSession.isPending &&
      !createSession.data
    ) {
      createSession.mutate()
    }
  }, [createSession, sessions.data])

  if (
    sessions.isLoading ||
    messages.isLoading ||
    ragQueries.isLoading ||
    createSession.isPending
  ) {
    return <LoadingBlock />
  }
  if (
    sessions.isError ||
    messages.isError ||
    ragQueries.isError ||
    createSession.isError ||
    !sessions.data ||
    !messages.data ||
    !ragQueries.data
  ) {
    return <ErrorState message="No se pudo cargar el chat." />
  }

  return (
    <>
      <PageHeader
        eyebrow="Chat RAG"
        title="Chat académico con IA local"
        description="Recuperación de contexto real sobre malla, historial, escenarios y PDFs; si hay un modelo local disponible, la generación se delega al servidor configurado."
      />
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <Card>
          <h3 className="font-semibold">Conversaciones</h3>
          <div className="mt-4 space-y-2">
            {sessions.data.map((session) => (
              <button
                key={session.id}
                onClick={() => setRequestedSessionId(session.id)}
                className={`w-full rounded-2xl p-3 text-left text-sm ${
                  selectedSessionId === session.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-slate-50 dark:bg-slate-800'
                }`}
              >
                {session.titulo}
              </button>
            ))}
          </div>
        </Card>
        <Card className="flex min-h-[620px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {messages.data.map((item) => (
              <div key={item.id} className={item.emisor === 'usuario' ? 'ml-auto max-w-[80%]' : 'max-w-[80%]'}>
                <div
                  className={`rounded-3xl p-4 text-sm ${
                    item.emisor === 'usuario'
                      ? 'bg-brand-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {item.mensaje}
                </div>
                <p className="mt-1 px-2 text-xs text-slate-400">
                  {new Intl.DateTimeFormat('es-CO', {
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(item.fecha))}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {quickQuestions.map((question) => (
              <button
                key={question}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                disabled={!selectedSessionId || send.isPending}
                onClick={() => send.mutate(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Haz una pregunta académica"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && message.trim() && selectedSessionId) {
                  send.mutate(message)
                }
              }}
            />
            <Button
              aria-label="Enviar pregunta"
              title="Enviar pregunta"
              onClick={() => send.mutate(message)}
              disabled={!message || !selectedSessionId || send.isPending}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Enviar pregunta</span>
            </Button>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">
                {formatModelLabel(settings.llmModel)} configurado
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge>RAG real</Badge>
                <span className="text-sm text-slate-500">
                  {settings.llmConnected ? 'LLM local disponible' : 'fallback controlado activo'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="font-semibold">Pipeline RAG</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>1. Recibir pregunta</li>
              <li>2. Buscar contexto</li>
              <li>3. Recuperar materias relacionadas</li>
              <li>4. Consultar grafo / historial</li>
              <li>5. Generar respuesta</li>
            </ol>
          </div>
          <div className="mt-5">
            <h3 className="font-semibold">Contexto recuperado por RAG</h3>
            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {latestRagQuery?.contextoRecuperado ??
                'Aún no hay contexto recuperado.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(latestRagQuery?.fuentesConsultadas ??
                latestAssistant?.fuentesOpcionales ??
                ['grafo curricular', 'historial académico', 'escenario guardado', 'documento PDF procesado']).map(
                (source) => (
                  <span
                    key={source}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800"
                  >
                    {source}
                  </span>
                ),
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
