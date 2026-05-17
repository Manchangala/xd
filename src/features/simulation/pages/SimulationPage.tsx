import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Route, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { curriculumService } from '@/features/curriculum/services/curriculumService'
import { usePrimaryProgramId } from '@/features/curriculum/hooks/usePrimaryProgramId'
import { simulationService } from '@/features/simulation/services/simulationService'
import { scenarioService } from '@/features/scenarios/services/scenarioService'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { SimulationResult } from '@/types/simulation'
import type { ScenarioEventType } from '@/types/scenario'

export function SimulationPage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const [params] = useSearchParams()
  const [courseId, setCourseId] = useState(params.get('course') ?? '')
  const [eventType, setEventType] = useState<
    Exclude<ScenarioEventType, 'aprobacion'>
  >((params.get('type') as Exclude<ScenarioEventType, 'aprobacion'>) ?? 'perdida')
  const [scenarioName, setScenarioName] = useState('Escenario nuevo')
  const [result, setResult] = useState<SimulationResult | null>(null)
  const queryClient = useQueryClient()
  const { pushToast } = useToast()
  const primaryProgram = usePrimaryProgramId(studentId)

  const graph = useQuery({
    queryKey: ['graph', studentId, primaryProgram.data],
    queryFn: () => curriculumService.getCurriculumGraph(primaryProgram.data!, studentId),
    enabled: Boolean(primaryProgram.data),
  })
  const effectiveCourseId = courseId || graph.data?.materias[0]?.id || ''
  const simulate = useMutation({
    mutationFn: () =>
      simulationService.simulateEvent(studentId, {
        materiaId: effectiveCourseId,
        tipoEvento: eventType,
      }),
    onSuccess: (data) => {
      setResult(data)
      pushToast({ title: 'Simulación ejecutada' })
    },
    onError: (error) => {
      pushToast({
        title: 'No se pudo ejecutar la simulación',
        description:
          error instanceof Error
            ? error.message
            : 'Revisa la materia seleccionada e intenta nuevamente.',
      })
    },
  })
  const saveScenario = useMutation({
    mutationFn: () =>
      scenarioService.saveScenario(
        studentId,
        scenarioName,
        `Escenario generado desde ${eventType}.`,
        result!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      pushToast({ title: 'Escenario guardado' })
    },
    onError: (error) => {
      pushToast({
        title: 'No se pudo guardar el escenario',
        description:
          error instanceof Error
            ? error.message
            : 'El escenario no fue persistido. Intenta de nuevo.',
      })
    },
  })

  if (primaryProgram.isLoading || graph.isLoading) return <LoadingBlock />
  if (primaryProgram.isError || graph.isError || !graph.data) {
    return <ErrorState message="No se pudo cargar la simulación." />
  }

  const blockedCourses =
    result?.materiasBloqueadas
      .map((id) => graph.data.materias.find((course) => course.id === id))
      .filter(Boolean) ?? []
  const directBlockedCourses =
    result?.materiasBloqueadasDirectas
      .map((id) => graph.data.materias.find((course) => course.id === id))
      .filter(Boolean) ?? []
  const indirectBlockedCourses =
    result?.materiasBloqueadasIndirectas
      .map((id) => graph.data.materias.find((course) => course.id === id))
      .filter(Boolean) ?? []
  const selectedCourse = graph.data.materias.find((course) => course.id === effectiveCourseId)

  return (
    <>
      <PageHeader
        eyebrow="Simulación"
        title="Simular pérdida, cancelación o aplazamiento"
        description="Flujo inspirado en los diagramas adjuntos: evento, impacto en cascada, rutas y guardado de escenario."
      />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Materia</label>
              <Select value={effectiveCourseId} onChange={(event) => setCourseId(event.target.value)}>
                {graph.data.materias.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.codigo} · {course.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Tipo de evento</label>
              <Select
                value={eventType}
                onChange={(event) =>
                  setEventType(event.target.value as Exclude<ScenarioEventType, 'aprobacion'>)
                }
              >
                <option value="perdida">Pérdida</option>
                <option value="cancelacion">Cancelación</option>
                <option value="aplazamiento">Aplazamiento</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Nombre del escenario
              </label>
              <Input
                value={scenarioName}
                onChange={(event) => setScenarioName(event.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={() => simulate.mutate()} disabled={simulate.isPending}>
                Ejecutar
              </Button>
              <Button
                variant="outline"
                disabled={!result || saveScenario.isPending}
                onClick={() => saveScenario.mutate()}
              >
                {saveScenario.isPending ? 'Guardando...' : 'Guardar escenario'}
              </Button>
              <Button variant="ghost" onClick={() => setResult(null)}>
                Limpiar simulación
              </Button>
            </div>
            {selectedCourse ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                <p className="font-semibold">Materia seleccionada</p>
                <p className="mt-2">
                  {selectedCourse.codigo} · {selectedCourse.nombre}
                </p>
                <p className="mt-1 text-slate-500">
                  {selectedCourse.creditos} créditos · Semestre sugerido{' '}
                  {selectedCourse.semestreSugerido}
                </p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          {!result ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <TriangleAlert className="mb-3 h-8 w-8 text-brand-700" />
              <h3 className="font-semibold">Aún no hay simulación activa</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Selecciona una materia y ejecuta el evento para ver el antes/después.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm text-slate-500">Bloqueadas</p>
                  <p className="mt-1 text-2xl font-bold">{blockedCourses.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm text-slate-500">Impacto créditos</p>
                  <p className="mt-1 text-2xl font-bold">{result.impactoCreditos}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm text-slate-500">Graduación</p>
                  <p className="mt-1 text-2xl font-bold">
                    {result.semestreEstimadoAntes} → {result.semestreEstimadoDespues}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Antes / después</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500">Antes</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <p>Graduación estimada: semestre {result.semestreEstimadoAntes}</p>
                      <p>Créditos disponibles: {result.creditosDisponiblesAntes}</p>
                      <p>Cadena crítica sin ruptura.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950/20">
                    <p className="text-sm text-brand-700">Después</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <p>Graduación estimada: semestre {result.semestreEstimadoDespues}</p>
                      <p>Créditos disponibles: {result.creditosDisponiblesDespues}</p>
                      <p>{result.explicacion}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Materias bloqueadas en cascada</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/20">
                    <p className="text-sm font-semibold text-rose-700">Impacto directo</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {directBlockedCourses.map((course) => (
                        <span
                          key={course!.id}
                          className="rounded-full bg-white px-3 py-1 text-sm text-rose-700"
                        >
                          {course!.codigo}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <p className="text-sm font-semibold text-amber-700">
                      Impacto indirecto
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {indirectBlockedCourses.map((course) => (
                        <span
                          key={course!.id}
                          className="rounded-full bg-white px-3 py-1 text-sm text-amber-700"
                        >
                          {course!.codigo}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Rutas sugeridas</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {result.rutas.map((route) => (
                    <div
                      key={route.id}
                      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-brand-700" />
                        <p className="font-semibold">{route.nombre}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Graduación: semestre {route.semestreEstimadoGraduacion}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Carga {route.cargaTrabajo} · Dificultad {route.dificultad}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-sm text-white dark:bg-white dark:text-slate-950">
                <span>Evento aplicado</span>
                <ArrowRight className="h-4 w-4" />
                <span>{blockedCourses.length} materias afectadas</span>
                <ArrowRight className="h-4 w-4" />
                <span>{result.rutas.length} rutas alternativas generadas</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
