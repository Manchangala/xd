import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { STORAGE_KEYS } from '@/lib/constants'
import { getAppSettings } from '@/lib/api/config'
import { writeStorage } from '@/lib/storage/localStorage'
import { aiChatService } from '@/features/ai-chat/services/aiChatService'
import type { LlmConnectionStatus } from '@/types/chat'
import type { AppSettings } from '@/types/settings'

const formatProvider = (provider?: string | null) => {
  if (!provider) return 'Proveedor no detectado'
  if (provider === 'ollama') return 'Ollama'
  if (provider === 'openai_compatible') return 'OpenAI compatible / LM Studio'
  return provider
}

export function SettingsPage() {
  const { pushToast } = useToast()
  const [settings, setSettings] = useState<AppSettings>(getAppSettings())
  const [connectionDetails, setConnectionDetails] =
    useState<LlmConnectionStatus | null>(null)
  const testConnection = useMutation({
    mutationFn: () =>
      aiChatService.connectToLocalLLM(settings.llmEndpoint, settings.llmModel),
    onSuccess: (result) => {
      setSettings((current) => ({
        ...current,
        llmConnected: result.connected,
        llmProvider: result.provider ?? current.llmProvider,
        llmEndpoint: result.baseUrl ?? current.llmEndpoint,
      }))
      setConnectionDetails(result)
      pushToast({
        title: result.connected ? 'Conexión exitosa' : 'Conexión no disponible',
        description: result.message,
      })
    },
    onError: (error) => {
      setConnectionDetails({
        connected: false,
        reachable: false,
        availableModels: [],
        resolvedModel: undefined,
        issues: [
          error instanceof Error
            ? error.message
            : 'No se pudo contactar el endpoint configurado.',
        ],
        nextSteps: [
          'Verifica que el servidor LLM local esté encendido.',
          'Confirma que el endpoint configurado sea correcto.',
        ],
        message: 'No se pudo conectar con el servidor local configurado.',
      })
    },
  })

  useEffect(() => {
    document.body.classList.toggle('dark', settings.theme === 'dark')
  }, [settings.theme])

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Preferencias e integraciones"
        description="Ajustes visuales, fuente de datos, URL base de API y configuración del modelo local."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <h3 className="text-lg font-semibold">Preferencias visuales</h3>
          <div>
            <label className="mb-2 block text-sm font-medium">Tema</label>
          <Select
            value={settings.theme}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                theme: event.target.value as AppSettings['theme'],
              }))
            }
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Carga máxima de créditos
            </label>
            <Input
              type="number"
              value={settings.maxCredits}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  maxCredits: Number(event.target.value),
                }))
              }
            />
          </div>
        </Card>
        <Card className="space-y-4">
          <h3 className="text-lg font-semibold">Backend e IA local</h3>
          <div>
            <label className="mb-2 block text-sm font-medium">Fuente de datos</label>
            <Select
              value={settings.dataSource}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  dataSource: event.target.value as AppSettings['dataSource'],
                }))
              }
            >
              <option value="api">API real</option>
              <option value="mock">Mocks locales</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">API base URL</label>
          <Input
            value={settings.apiBaseUrl}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                apiBaseUrl: event.target.value,
              }))
            }
          />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Proveedor</label>
          <Select
            value={settings.llmProvider}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                llmProvider: event.target.value,
              }))
            }
          >
            <option value="local">Local automático</option>
            <option value="ollama">Ollama</option>
            <option value="openai_compatible">LM Studio / OpenAI compatible</option>
          </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Modelo local</label>
          <Select
            value={settings.llmModel}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                llmModel: event.target.value,
              }))
            }
          >
            <option value="gemma">Gemma</option>
            <option value="llama">Llama</option>
            <option value="mistral">Mistral</option>
            <option value="otro">Otro</option>
          </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Endpoint local</label>
          <Input
            value={settings.llmEndpoint}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                llmEndpoint: event.target.value,
              }))
            }
          />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <div>
              <p className="text-sm font-medium">Estado de conexión</p>
              <p className="mt-1 text-sm text-slate-500">
                {settings.llmConnected
                  ? 'El endpoint local respondió correctamente.'
                  : 'Aún no se ha validado un modelo local disponible.'}
              </p>
            </div>
            <Badge>{settings.llmConnected ? 'conectado' : 'sin LLM local'}</Badge>
          </div>
          {connectionDetails ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {connectionDetails.reachable ? 'servidor visible' : 'servidor no visible'}
                </Badge>
                {connectionDetails.provider ? (
                  <Badge>{formatProvider(connectionDetails.provider)}</Badge>
                ) : null}
                {connectionDetails.resolvedModel ? (
                  <Badge>{connectionDetails.resolvedModel}</Badge>
                ) : null}
              </div>
              {connectionDetails.baseUrl ? (
                <p className="text-slate-600 dark:text-slate-300">
                  Endpoint detectado: {connectionDetails.baseUrl}
                </p>
              ) : null}
              {connectionDetails.availableModels.length ? (
                <p className="text-slate-600 dark:text-slate-300">
                  Modelos disponibles: {connectionDetails.availableModels.join(', ')}
                </p>
              ) : null}
              {connectionDetails.issues.length ? (
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  {connectionDetails.issues.map((issue) => (
                    <li key={issue}>• {issue}</li>
                  ))}
                </ul>
              ) : null}
              {connectionDetails.nextSteps.length ? (
                <div>
                  <p className="font-medium">Siguientes pasos</p>
                  <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                    {connectionDetails.nextSteps.map((step) => (
                      <li key={step}>• {step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            writeStorage(STORAGE_KEYS.settings, settings)
            pushToast({ title: 'Configuración guardada' })
          }}
        >
          Guardar configuración
        </Button>
        <Button
          variant="outline"
          aria-label="Probar conexión"
          disabled={testConnection.isPending}
          onClick={() => {
            setConnectionDetails({
              connected: false,
              reachable: false,
              availableModels: [],
              resolvedModel: undefined,
              issues: ['Validando endpoint local.'],
              nextSteps: ['Espera el diagnóstico del backend.'],
              message: 'Validando conexión local.',
            })
            testConnection.mutate()
          }}
        >
          {testConnection.isPending ? 'Probando...' : 'Probar conexión'}
        </Button>
      </div>
    </>
  )
}
