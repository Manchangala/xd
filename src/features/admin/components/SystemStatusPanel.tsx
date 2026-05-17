import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { SectionTitle } from '@/components/ui/section'
import { adminService } from '@/features/admin/services/adminService'
import { cn } from '@/lib/utils'
import type { SystemCheck } from '@/types/admin'

const statusStyles: Record<SystemCheck['estado'], string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
  error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100',
}

const badgeStyles: Record<SystemCheck['estado'], string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-rose-100 text-rose-700',
}

const statusIcon = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: CircleHelp,
}

const statusLabel = {
  ok: 'Operativo',
  warning: 'Atención',
  error: 'Error',
}

export function SystemStatusPanel() {
  const status = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: adminService.getSystemStatus,
  })

  if (status.isLoading) return <LoadingBlock />
  if (status.isError || !status.data) {
    return <ErrorState message="No se pudo cargar el estado operativo del sistema." />
  }

  const totals = status.data.checks.reduce(
    (acc, check) => ({ ...acc, [check.estado]: acc[check.estado] + 1 }),
    { ok: 0, warning: 0, error: 0 },
  )

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              Diagnóstico operativo
            </p>
            <h3 className="mt-1 text-xl font-bold">{status.data.appName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Entorno activo: {status.data.environment}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-100 text-emerald-700">{totals.ok} OK</Badge>
            <Badge className="bg-amber-100 text-amber-700">{totals.warning} atención</Badge>
            <Badge className="bg-rose-100 text-rose-700">{totals.error} error</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {status.data.checks.map((check) => {
          const Icon = statusIcon[check.estado]
          return (
            <div
              key={check.id}
              className={cn('rounded-3xl border p-4', statusStyles[check.estado])}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">{check.nombre}</p>
                    <p className="mt-1 text-sm opacity-85">{check.detalle}</p>
                  </div>
                </div>
                <Badge className={badgeStyles[check.estado]}>{statusLabel[check.estado]}</Badge>
              </div>
              {check.accionRecomendada ? (
                <div className="mt-4 rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-950/30">
                  <span className="font-semibold">Acción recomendada: </span>
                  {check.accionRecomendada}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <Card className="border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
        <SectionTitle
          title="Lectura ejecutiva"
          description="Este panel permite explicar en demo qué partes están operativas, cuáles son opcionales y qué faltaría endurecer antes de producción."
        />
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <Activity className="h-5 w-5 text-brand-700" />
          <p>
            Si API, base de datos y configuración aparecen operativas, el sistema está listo para recorridos funcionales. OCR y LLM pueden quedar en atención si dependen de herramientas locales externas.
          </p>
        </div>
      </Card>
    </div>
  )
}
