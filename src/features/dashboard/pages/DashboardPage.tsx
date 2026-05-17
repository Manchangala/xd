import { useQuery } from '@tanstack/react-query'
import {
  BookOpenCheck,
  CalendarClock,
  ChartNoAxesCombined,
  GitBranch,
  MessageCircle,
  NotebookPen,
  Route,
  TriangleAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatCard } from '@/components/cards/StatCard'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page'
import { ProgressBar } from '@/components/ui/progress'
import { SectionTitle } from '@/components/ui/section'
import { ChartFrame } from '@/components/ui/chart'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { usePrimaryProgramId } from '@/features/curriculum/hooks/usePrimaryProgramId'
import { useAuthStore } from '@/features/auth/store/authStore'
import { formatPercentage } from '@/lib/utils'

const quickActions = [
  { label: 'Ver malla', to: '/malla', icon: GitBranch },
  { label: 'Simular pérdida', to: '/simulacion', icon: TriangleAlert },
  { label: 'Rutas alternativas', to: '/rutas', icon: Route },
  { label: 'Comparar escenarios', to: '/comparar', icon: ChartNoAxesCombined },
  { label: 'Chat académico', to: '/chat', icon: MessageCircle },
]

export function DashboardPage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const primaryProgram = usePrimaryProgramId(studentId)
  const summary = useQuery({
    queryKey: ['progress', studentId, primaryProgram.data],
    queryFn: () => curriculumService.getProgressSummary(studentId, primaryProgram.data!),
    enabled: Boolean(primaryProgram.data),
  })

  if (primaryProgram.isLoading || summary.isLoading) return <LoadingBlock />
  if (primaryProgram.isError || summary.isError || !summary.data) {
    return <ErrorState message="No se pudo cargar el dashboard." />
  }

  const hasApprovedCredits = summary.data.creditosAprobados > 0
  const planningMessage = hasApprovedCredits
    ? `Tu prioridad actual es cerrar las materias que desbloquean la cadena de programación y reducir las ${summary.data.bloqueadas} asignaturas bloqueadas.`
    : 'Como estás iniciando, es normal que las materias avanzadas aparezcan bloqueadas: se irán habilitando cuando apruebes sus prerrequisitos.'

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Tu panorama académico"
        description="Resumen de avance, disponibilidad y acciones rápidas para planear tu siguiente movimiento."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Avance total"
          value={formatPercentage(summary.data.porcentajeAvance)}
          hint={`${summary.data.creditosAprobados} / ${summary.data.totalCreditos} créditos`}
          icon={ChartNoAxesCombined}
        />
        <StatCard
          title="Promedio acumulado"
          value={
            summary.data.promedioAcumulado === null
              ? 'Sin promedio'
              : summary.data.promedioAcumulado.toFixed(2)
          }
          hint={
            summary.data.promedioAcumulado === null
              ? 'Aún no hay materias aprobadas'
              : 'Historial consolidado'
          }
          icon={BookOpenCheck}
        />
        <StatCard
          title="Materias aprobadas"
          value={summary.data.aprobadas}
          hint="Historial consolidado"
          icon={BookOpenCheck}
        />
        <StatCard
          title="Materias en curso"
          value={summary.data.enCurso}
          hint="Semestre actual"
          icon={NotebookPen}
        />
        <StatCard
          title="Materias bloqueadas"
          value={summary.data.bloqueadas}
          hint="Por prerrequisitos pendientes"
          icon={TriangleAlert}
        />
        <StatCard
          title="Graduación estimada"
          value={`Sem. ${summary.data.semestreEstimadoGraduacion}`}
          hint="Según créditos y carga"
          icon={CalendarClock}
        />
      </div>

      <Card className="mt-5 overflow-hidden bg-slate-950 text-white dark:bg-white dark:text-slate-950">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm text-slate-300 dark:text-slate-600">
              Línea general del programa
            </p>
            <h3 className="mt-2 text-2xl font-bold">
              Has completado {summary.data.creditosAprobados} créditos
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 dark:text-slate-600">
              {planningMessage}
            </p>
            <ProgressBar
              value={summary.data.porcentajeAvance}
              className="mt-5 bg-white/15 dark:bg-slate-200"
            />
          </div>
          <div className="rounded-3xl bg-white/10 p-5 text-right dark:bg-slate-950/5">
            <p className="text-sm text-slate-300 dark:text-slate-600">Estimación</p>
            <p className="mt-1 text-3xl font-bold">
              Sem. {summary.data.semestreEstimadoGraduacion}
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-w-0">
          <SectionTitle
            title="Avance por semestre"
            action={<span className="text-sm text-slate-500">Créditos aprobados</span>}
          />
          <ChartFrame className="h-72">
            {({ width, height }) =>
              hasApprovedCredits ? (
                <BarChart width={width} height={height} data={summary.data.avancePorSemestre}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="semestre" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="aprobados" fill="#be123c" radius={[8, 8, 0, 0]} />
                </BarChart>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800">
                  Aún no hay créditos aprobados para graficar. Cuando marques materias como
                  aprobadas, este gráfico mostrará tu avance real por semestre.
                </div>
              )
            }
          </ChartFrame>
        </Card>
        <Card>
          <SectionTitle
            title="Acciones rápidas"
            description="Atajos para los flujos que más ayudan a planear."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickActions.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:bg-brand-950/20"
              >
                <Icon className="mb-3 h-5 w-5 text-brand-700" />
                <p className="font-medium">{label}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle
            title="Materias disponibles próximo semestre"
            description="Asignaturas habilitadas por tus prerrequisitos aprobados."
          />
          <div className="mt-4 space-y-3">
            {summary.data.disponiblesProximoSemestre.length ? (
              summary.data.disponiblesProximoSemestre.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
                >
                  <div>
                    <p className="font-medium">{course.nombre}</p>
                    <p className="text-sm text-slate-500">{course.codigo}</p>
                  </div>
                  <span className="text-sm font-semibold">{course.creditos} cr.</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800">
                Aún no hay materias habilitadas para el próximo semestre.
              </div>
            )}
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="Alertas académicas"
            description="Señales que conviene revisar antes de matricular."
          />
          <div className="mt-4 space-y-3">
            {summary.data.alertas.length ? (
              summary.data.alertas.map((alert) => (
                <div
                  key={alert}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                >
                  {alert}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                No hay alertas académicas activas.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
