import { mockAdapter } from '@/lib/api/mockAdapter'
import { apiClient } from '@/lib/api/apiClient'
import { endpoints } from '@/lib/api/endpoints'
import { shouldUseApi } from '@/lib/api/config'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage/localStorage'
import { uid } from '@/lib/utils'
import type { SimulationResult } from '@/types/simulation'
import type {
  Escenario,
  EventoEscenario,
  PasoRuta,
  ResultadoEscenario,
  RutaAlternativa,
  ScenarioSnapshot,
  Workload,
} from '@/types/scenario'

const readAll = () => ({
  scenarios: readStorage<Escenario[]>(STORAGE_KEYS.scenarios, []),
  events: readStorage<EventoEscenario[]>(STORAGE_KEYS.scenarioEvents, []),
  results: readStorage<ResultadoEscenario[]>(STORAGE_KEYS.scenarioResults, []),
  routes: readStorage<RutaAlternativa[]>(STORAGE_KEYS.routes, []),
  steps: readStorage<PasoRuta[]>(STORAGE_KEYS.routeSteps, []),
})

const toSnapshot = (scenario: Escenario): ScenarioSnapshot => {
  const { events, results, routes, steps } = readAll()
  const scenarioEvents = events.filter((item) => item.escenarioId === scenario.id)
  const scenarioResults = results.filter((item) => item.escenarioId === scenario.id)
  const scenarioRoutes = routes.filter((item) => item.escenarioId === scenario.id)
  const routeIds = new Set(scenarioRoutes.map((route) => route.id))
  const scenarioSteps = steps.filter((item) => routeIds.has(item.rutaId))
  const bestRoute = scenarioRoutes.sort((a, b) => a.orden - b.orden)[0]
  const blocked = scenarioResults.filter(
    (item) => item.estadoSimulado === 'bloqueada',
  ).length
  const workload: Workload = bestRoute?.cargaTrabajo ?? 'media'
  return {
    escenario: scenario,
    eventos: scenarioEvents,
    resultados: scenarioResults,
    rutas: scenarioRoutes,
    pasosRuta: scenarioSteps,
    resumen: {
      materiasBloqueadas: blocked,
      creditosDisponibles: Math.max(12, 24 - blocked * 2),
      semestreEstimadoGraduacion: bestRoute?.semestreEstimadoGraduacion ?? 9,
      creditosPromedioSemestre:
        workload === 'alta' ? 22 : workload === 'media' ? 18 : 14,
      promedioProyectado: workload === 'alta' ? 3.95 : workload === 'media' ? 4.08 : 4.18,
      cargaTrabajo: workload,
    },
  }
}

export const scenarioService = {
  getScenarios(studentId: string) {
    if (shouldUseApi()) {
      return apiClient.get<ScenarioSnapshot[]>(
        endpoints.studentScenarios(studentId),
      )
    }
    return mockAdapter(() =>
      readAll()
        .scenarios.filter((scenario) => scenario.estudianteId === studentId)
        .map(toSnapshot),
    )
  },
  saveScenario(
    studentId: string,
    nombre: string,
    descripcion: string,
    result: SimulationResult,
  ) {
    if (shouldUseApi()) {
      return apiClient.post<
        {
          studentId: string
          nombre: string
          descripcion: string
          simulacion: SimulationResult
        },
        ScenarioSnapshot
      >(endpoints.scenarios, {
        studentId,
        nombre,
        descripcion,
        simulacion: result,
      })
    }
    return mockAdapter(() => {
      const store = readAll()
      if (
        store.scenarios.filter((item) => item.estudianteId === studentId).length >= 20
      ) {
        throw new Error('Solo puedes guardar hasta veinte escenarios en esta demo')
      }
      const now = new Date().toISOString()
      const scenarioId = uid('scenario')
      const scenario: Escenario = {
        id: scenarioId,
        estudianteId: studentId,
        nombre,
        descripcion,
        creadoEn: now,
        actualizadoEn: now,
      }
      const event: EventoEscenario = {
        id: uid('event'),
        escenarioId: scenarioId,
        materiaId: result.evento.materiaId,
        tipoEvento: result.evento.tipoEvento,
      }
      const resultados: ResultadoEscenario[] = result.historialSimulado.map((item) => ({
        id: uid('result'),
        escenarioId: scenarioId,
        materiaId: item.materiaId,
        estadoSimulado: item.estado,
      }))
      const rutas = result.rutas.map((route, index) => ({
        ...route,
        id: uid('route'),
        escenarioId: scenarioId,
        orden: index + 1,
      }))
      const courseChain = [result.evento.materiaId, ...result.materiasBloqueadas]
      const routeSteps: PasoRuta[] = rutas.flatMap((route) =>
        courseChain.map((materiaId, index) => ({
          id: uid('step'),
          rutaId: route.id,
          materiaId,
          semestreSugerido:
            route.semestreEstimadoGraduacion -
            route.duracionEstimada +
            1 +
            Math.min(index, route.duracionEstimada - 1),
          orden: index + 1,
        })),
      )

      writeStorage(STORAGE_KEYS.scenarios, [...store.scenarios, scenario])
      writeStorage(STORAGE_KEYS.scenarioEvents, [...store.events, event])
      writeStorage(STORAGE_KEYS.scenarioResults, [...store.results, ...resultados])
      writeStorage(STORAGE_KEYS.routes, [...store.routes, ...rutas])
      writeStorage(STORAGE_KEYS.routeSteps, [...store.steps, ...routeSteps])
      return toSnapshot(scenario)
    })
  },
  compareScenarios(scenarioAId: string, scenarioBId: string) {
    if (shouldUseApi()) {
      return apiClient.post<
        { scenarioAId: string; scenarioBId: string },
        { a: ScenarioSnapshot; b: ScenarioSnapshot }
      >(endpoints.compareScenarios, {
        scenarioAId,
        scenarioBId,
      })
    }
    return mockAdapter(() => {
      const { scenarios } = readAll()
      const a = scenarios.find((item) => item.id === scenarioAId)
      const b = scenarios.find((item) => item.id === scenarioBId)
      if (!a || !b) throw new Error('Selecciona dos escenarios válidos')
      return {
        a: toSnapshot(a),
        b: toSnapshot(b),
      }
    })
  },
}
