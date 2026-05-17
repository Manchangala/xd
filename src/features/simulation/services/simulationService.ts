import { mockAdapter } from '@/lib/api/mockAdapter'
import { apiClient } from '@/lib/api/apiClient'
import { endpoints } from '@/lib/api/endpoints'
import { shouldUseApi } from '@/lib/api/config'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage } from '@/lib/storage/localStorage'
import {
  calcularBloqueosEnCascada,
  calcularImpactoCreditos,
  generarRutasAlternativas,
  recalcularEstados,
} from '@/features/simulation/utils/simulationUtils'
import {
  buildCoursesWithState,
  materiasDisponibles,
  obtenerDependientes,
} from '@/features/curriculum/utils/curriculumUtils'
import type {
  DependenciaMateria,
  HistorialAcademico,
  Materia,
} from '@/types/curriculum'
import type { SimulationEvent, SimulationResult } from '@/types/simulation'

export const simulationService = {
  simulateEvent(
    studentId: string,
    event: SimulationEvent,
  ): Promise<SimulationResult> {
    if (shouldUseApi()) {
      const endpoint =
        event.tipoEvento === 'perdida'
          ? endpoints.simulation.failure
          : event.tipoEvento === 'cancelacion'
            ? endpoints.simulation.cancellation
            : endpoints.simulation.postponement
      return apiClient.post<
        { studentId: string; courseId: string },
        SimulationResult
      >(endpoint, {
        studentId,
        courseId: event.materiaId,
      })
    }
    return mockAdapter(() => {
      const histories = readStorage<HistorialAcademico[]>(
        STORAGE_KEYS.histories,
        [],
      ).filter((item) => item.estudianteId === studentId)
      const allCourses = readStorage<Materia[]>(STORAGE_KEYS.courses, [])
      const allDependencies = readStorage<DependenciaMateria[]>(
        STORAGE_KEYS.dependencies,
        [],
      )
      const course = allCourses.find((item) => item.id === event.materiaId)
      if (!course) throw new Error('Materia no encontrada')
      const courses = allCourses.filter(
        (item) => item.versionMallaId === course.versionMallaId,
      )
      const courseIds = new Set(courses.map((item) => item.id))
      const dependencies = allDependencies.filter(
        (dependency) =>
          courseIds.has(dependency.materiaId) &&
          courseIds.has(dependency.materiaRequeridaId),
      )
      const programHistories = histories.filter((item) => courseIds.has(item.materiaId))

      const affected = calcularBloqueosEnCascada(event.materiaId, dependencies)
      const directAffected = obtenerDependientes(event.materiaId, dependencies)
      const indirectAffected = affected.filter((id) => !directAffected.includes(id))
      const simulated = recalcularEstados(programHistories, event, dependencies)
      const impactCredits = calcularImpactoCreditos(courses, affected)
      const beforeAvailable = materiasDisponibles(
        buildCoursesWithState(courses, dependencies, programHistories),
      ).reduce((sum, item) => sum + item.creditos, 0)
      const afterAvailable = materiasDisponibles(
        buildCoursesWithState(courses, dependencies, simulated),
      ).reduce((sum, item) => sum + item.creditos, 0)
      const before = 9
      const after =
        event.tipoEvento === 'perdida'
          ? before + Math.max(1, Math.ceil(affected.length / 3))
          : before + 1
      const explanation = `${course.nombre} bloquea ${directAffected.length} materia(s) de forma directa y ${indirectAffected.length} de forma indirecta dentro de la cadena curricular.`

      return {
        evento: event,
        historialOriginal: programHistories,
        historialSimulado: simulated,
        materiasBloqueadas: affected,
        materiasBloqueadasDirectas: directAffected,
        materiasBloqueadasIndirectas: indirectAffected,
        impactoCreditos: impactCredits,
        creditosDisponiblesAntes: beforeAvailable,
        creditosDisponiblesDespues: afterAvailable,
        semestreEstimadoAntes: before,
        semestreEstimadoDespues: after,
        explicacion: explanation,
        rutas: generarRutasAlternativas('preview', after - 1),
      }
    })
  },
  simulateCourseFailure(studentId: string, courseId: string) {
    return simulationService.simulateEvent(studentId, {
      materiaId: courseId,
      tipoEvento: 'perdida',
    })
  },
}
