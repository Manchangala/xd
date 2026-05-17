import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { usePrimaryProgramId } from '@/features/curriculum/hooks/usePrimaryProgramId'
import { scenarioService } from '@/features/scenarios/services/scenarioService'
import { useAuthStore } from '@/features/auth/store/authStore'

export function RoutesPage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const [selectedScenarioId, setSelectedScenarioId] = useState('scenario_1')
  const [selectedRouteId, setSelectedRouteId] = useState<string>()
  const primaryProgram = usePrimaryProgramId(studentId)
  const scenarios = useQuery({
    queryKey: ['scenarios', studentId],
    queryFn: () => scenarioService.getScenarios(studentId),
  })
  const graph = useQuery({
    queryKey: ['graph', studentId, primaryProgram.data],
    queryFn: () => curriculumService.getCurriculumGraph(primaryProgram.data!, studentId),
    enabled: Boolean(primaryProgram.data),
  })

  if (primaryProgram.isLoading || scenarios.isLoading || graph.isLoading) {
    return <LoadingBlock />
  }
  if (
    primaryProgram.isError ||
    scenarios.isError ||
    graph.isError ||
    !scenarios.data ||
    !graph.data
  ) {
    return <ErrorState message="No se pudieron cargar las rutas." />
  }

  if (!scenarios.data.length) {
    return (
      <EmptyState
        title="Aún no hay rutas guardadas"
        description="Guarda una simulación para visualizar aquí sus rutas alternativas."
      />
    )
  }

  const selectedScenario =
    scenarios.data.find((item) => item.escenario.id === selectedScenarioId) ??
    scenarios.data[0]
  const routes = selectedScenario.rutas
  const activeRoute =
    routes.find((route) => route.id === selectedRouteId) ?? routes[0]
  const routeSteps = selectedScenario.pasosRuta.filter(
    (step) => step.rutaId === activeRoute?.id,
  )
  const groupedSteps = routeSteps.reduce<Record<number, typeof routeSteps>>(
    (acc, step) => {
      acc[step.semestreSugerido] ??= []
      acc[step.semestreSugerido].push(step)
      return acc
    },
    {},
  )
  const courseById = new Map(graph.data.materias.map((course) => [course.id, course]))

  return (
    <>
      <PageHeader
        eyebrow="Rutas"
        title="Rutas alternativas"
        description="Tres estrategias sugeridas para recuperar avance con distintos niveles de carga y duración."
      />
      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div>
            <label className="mb-2 block text-sm font-medium">Escenario</label>
            <Select
              value={selectedScenario.escenario.id}
              onChange={(event) => {
                setSelectedScenarioId(event.target.value)
                setSelectedRouteId(undefined)
              }}
            >
              {scenarios.data.map((scenario) => (
                <option key={scenario.escenario.id} value={scenario.escenario.id}>
                  {scenario.escenario.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
            <p className="font-semibold">Resumen del escenario</p>
            <p className="mt-2 text-slate-500">
              {selectedScenario.escenario.descripcion}
            </p>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {routes.map((route) => (
          <Card
            key={route.id}
            className={
              route.id === activeRoute?.id
                ? 'border-brand-300 ring-2 ring-brand-100'
                : undefined
            }
          >
            <h3 className="text-xl font-bold">{route.nombre}</h3>
            <p className="mt-2 text-sm text-slate-500">{route.descripcion}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p>Duración estimada: {route.duracionEstimada} semestres</p>
              <p>Dificultad: {route.dificultad}</p>
              <p>Carga académica: {route.cargaTrabajo}</p>
              <p>Graduación: semestre {route.semestreEstimadoGraduacion}</p>
            </div>
            <div className="mt-5 grid gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    `/comparar?a=${selectedScenario.escenario.id}&route=${route.id}`,
                  )
                }
              >
                Comparar
              </Button>
              <Button onClick={() => pushToast({ title: `${route.nombre} marcada como preferida` })}>
                Aplicar ruta
              </Button>
              <Button variant="ghost" onClick={() => setSelectedRouteId(route.id)}>
                Ver timeline
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Timeline visual</h3>
            <p className="text-sm text-slate-500">{activeRoute?.nombre}</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
            Graduación sem. {activeRoute?.semestreEstimadoGraduacion}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Object.entries(groupedSteps).map(([semester, semesterSteps]) => (
            <div
              key={semester}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <p className="text-sm text-slate-500">Semestre {semester}</p>
              <div className="mt-3 space-y-2">
                {semesterSteps.map((step) => {
                  const course = courseById.get(step.materiaId)
                  return (
                    <div key={step.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-sm font-semibold">
                        {course?.codigo ?? step.materiaId}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {course?.nombre ?? 'Materia por definir'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
