import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { ChartFrame } from '@/components/ui/chart'
import { scenarioService } from '@/features/scenarios/services/scenarioService'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { ScenarioSnapshot } from '@/types/scenario'

export function ComparePage() {
  const studentId = useAuthStore((state) => state.session?.studentId) ?? 'student_1'
  const { pushToast } = useToast()
  const [params] = useSearchParams()
  const scenarios = useQuery({
    queryKey: ['scenarios', studentId],
    queryFn: () => scenarioService.getScenarios(studentId),
  })
  const [aId, setAId] = useState(params.get('a') ?? '')
  const [bId, setBId] = useState(params.get('b') ?? '')

  const selectedAId = useMemo(() => {
    const items = scenarios.data ?? []
    return items.some((item) => item.escenario.id === aId)
      ? aId
      : (items[0]?.escenario.id ?? '')
  }, [aId, scenarios.data])

  const selectedBId = useMemo(() => {
    const items = scenarios.data ?? []
    const alternative = items.filter((item) => item.escenario.id !== selectedAId)
    return alternative.some((item) => item.escenario.id === bId)
      ? bId
      : (alternative[0]?.escenario.id ?? '')
  }, [bId, scenarios.data, selectedAId])

  const comparison = useQuery({
    queryKey: ['comparison', selectedAId, selectedBId],
    queryFn: () => scenarioService.compareScenarios(selectedAId, selectedBId),
    enabled: Boolean(selectedAId && selectedBId && (scenarios.data?.length ?? 0) >= 2),
  })

  const chartData = useMemo(() => {
    if (!comparison.data) return []
    return [
      {
        metric: 'Bloqueadas',
        A: comparison.data.a.resumen.materiasBloqueadas,
        B: comparison.data.b.resumen.materiasBloqueadas,
      },
      {
        metric: 'Créditos disponibles',
        A: comparison.data.a.resumen.creditosDisponibles,
        B: comparison.data.b.resumen.creditosDisponibles,
      },
      {
        metric: 'Graduación',
        A: comparison.data.a.resumen.semestreEstimadoGraduacion,
        B: comparison.data.b.resumen.semestreEstimadoGraduacion,
      },
    ]
  }, [comparison.data])
  const recommendation = useMemo(() => {
    if (!comparison.data) return null
    const score = (item: ScenarioSnapshot) =>
      item.resumen.semestreEstimadoGraduacion * 3 +
      item.resumen.materiasBloqueadas * 2 +
      (item.resumen.cargaTrabajo === 'alta'
        ? 3
        : item.resumen.cargaTrabajo === 'media'
          ? 2
          : 1)
    return score(comparison.data.a) <= score(comparison.data.b)
      ? comparison.data.a
      : comparison.data.b
  }, [comparison.data])

  if (scenarios.isLoading) return <LoadingBlock />
  if (scenarios.isError || !scenarios.data) {
    return <ErrorState message="No se pudieron cargar los escenarios." />
  }

  if (scenarios.data.length < 2) {
    return (
      <>
        <PageHeader
          eyebrow="Comparación"
          title="Comparar escenarios"
          description="Contrasta duración, carga, créditos y materias bloqueadas para elegir con criterio."
        />
        <EmptyState
          title="Aún no hay escenarios suficientes"
          description="Guarda al menos dos simulaciones para comparar alternativas. Puedes crear escenarios desde la pantalla de Simulación."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Comparación"
        title="Comparar escenarios"
        description="Contrasta duración, carga, créditos y materias bloqueadas para elegir con criterio."
      />
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Select value={selectedAId} onChange={(event) => setAId(event.target.value)}>
            {scenarios.data.map((scenario) => (
              <option key={scenario.escenario.id} value={scenario.escenario.id}>
                {scenario.escenario.nombre}
              </option>
            ))}
          </Select>
          <Select value={selectedBId} onChange={(event) => setBId(event.target.value)}>
            {scenarios.data
              .filter((scenario) => scenario.escenario.id !== selectedAId)
              .map((scenario) => (
              <option key={scenario.escenario.id} value={scenario.escenario.id}>
                {scenario.escenario.nombre}
              </option>
            ))}
          </Select>
          <Button
            onClick={() =>
              pushToast({
                title: 'Mejor escenario elegido',
                description: 'Selección registrada para la comparación actual.',
              })
            }
          >
            Elegir mejor escenario
          </Button>
        </div>
      </Card>
      {comparison.isLoading ? (
        <div className="mt-5">
          <LoadingBlock />
        </div>
      ) : comparison.isError ? (
        <div className="mt-5">
          <ErrorState message="No se pudo comparar la selección actual. Elige dos escenarios guardados de tu perfil." />
        </div>
      ) : comparison.data ? (
        <>
          <Card className="mt-5 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Recomendación calculada
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  {recommendation?.escenario.nombre}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Se favorece la alternativa con menor retraso, menos materias bloqueadas y
                  una carga más sostenible.
                </p>
              </div>
              <Badge className="border-emerald-200 bg-white text-emerald-700">
                Mejor balance global
              </Badge>
            </div>
          </Card>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <Card className="min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3">Métrica</th>
                    <th className="pb-3">Escenario A</th>
                    <th className="pb-3">Escenario B</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Duración', comparison.data.a.resumen.semestreEstimadoGraduacion, comparison.data.b.resumen.semestreEstimadoGraduacion],
                    ['Créditos/semestre', comparison.data.a.resumen.creditosPromedioSemestre, comparison.data.b.resumen.creditosPromedioSemestre],
                    ['Promedio proyectado', comparison.data.a.resumen.promedioProyectado, comparison.data.b.resumen.promedioProyectado],
                    ['Carga de trabajo', comparison.data.a.resumen.cargaTrabajo, comparison.data.b.resumen.cargaTrabajo],
                    ['Materias bloqueadas', comparison.data.a.resumen.materiasBloqueadas, comparison.data.b.resumen.materiasBloqueadas],
                    ['Semestre estimado', comparison.data.a.resumen.semestreEstimadoGraduacion, comparison.data.b.resumen.semestreEstimadoGraduacion],
                  ].map(([label, a, b]) => (
                    <tr key={label as string} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-3 font-medium">{label}</td>
                      <td className={`py-3 ${recommendation?.escenario.id === comparison.data.a.escenario.id ? 'font-semibold text-emerald-700' : ''}`}>
                        {String(a)}
                      </td>
                      <td
                        className={`py-3 ${
                          recommendation?.escenario.id === comparison.data.b.escenario.id
                            ? 'font-semibold text-emerald-700'
                            : a !== b
                              ? 'font-semibold text-brand-700'
                              : ''
                        }`}
                      >
                        {String(b)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold">Gráfico comparativo</h3>
            <ChartFrame className="mt-4 h-72">
              {({ width, height }) => (
                <BarChart width={width} height={height} data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="A" fill="#be123c" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="B" fill="#0f172a" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ChartFrame>
          </Card>
        </div>
        </>
      ) : null}
    </>
  )
}
