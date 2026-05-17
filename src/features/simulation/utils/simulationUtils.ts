import type {
  DependenciaMateria,
  HistorialAcademico,
  Materia,
} from '@/types/curriculum'
import type { RutaAlternativa, ScenarioEventType } from '@/types/scenario'
import { obtenerDependientes } from '@/features/curriculum/utils/curriculumUtils'

export const calcularBloqueosEnCascada = (
  materiaId: string,
  dependencias: DependenciaMateria[],
) => {
  const visited = new Set<string>()
  const queue = [...obtenerDependientes(materiaId, dependencias)]

  while (queue.length) {
    const next = queue.shift()
    if (!next || visited.has(next)) continue
    visited.add(next)
    queue.push(...obtenerDependientes(next, dependencias))
  }

  return [...visited]
}

export const recalcularEstados = (
  historial: HistorialAcademico[],
  evento: { materiaId: string; tipoEvento: Exclude<ScenarioEventType, 'aprobacion'> },
  dependencias: DependenciaMateria[],
): HistorialAcademico[] => {
  const afectadas = calcularBloqueosEnCascada(evento.materiaId, dependencias)
  const now = new Date().toISOString()
  return historial.map((item) => {
    if (item.materiaId === evento.materiaId) {
      return {
        ...item,
        estado: evento.tipoEvento === 'perdida' ? 'reprobada' : 'pendiente',
        actualizadoEn: now,
      }
    }
    if (afectadas.includes(item.materiaId)) {
      return {
        ...item,
        estado: 'bloqueada',
        actualizadoEn: now,
      }
    }
    return item
  })
}

export const generarRutasAlternativas = (
  escenarioId: string,
  baseSemester: number,
): RutaAlternativa[] => [
  {
    id: `${escenarioId}_accelerated`,
    escenarioId,
    nombre: 'Ruta acelerada',
    orden: 1,
    semestreEstimadoGraduacion: baseSemester + 1,
    duracionEstimada: 3,
    dificultad: 'alta',
    cargaTrabajo: 'alta',
    descripcion:
      'Recupera la materia crítica cuanto antes y concentra más créditos para minimizar el retraso.',
  },
  {
    id: `${escenarioId}_balanced`,
    escenarioId,
    nombre: 'Ruta balanceada',
    orden: 2,
    semestreEstimadoGraduacion: baseSemester + 2,
    duracionEstimada: 4,
    dificultad: 'media',
    cargaTrabajo: 'media',
    descripcion:
      'Distribuye el esfuerzo entre semestres y conserva un ritmo sostenible de avance.',
  },
  {
    id: `${escenarioId}_paced`,
    escenarioId,
    nombre: 'Ruta pausada',
    orden: 3,
    semestreEstimadoGraduacion: baseSemester + 3,
    duracionEstimada: 5,
    dificultad: 'baja',
    cargaTrabajo: 'baja',
    descripcion:
      'Reduce carga por semestre y prioriza estabilidad académica a cambio de más duración.',
  },
]

export const calcularImpactoCreditos = (
  materias: Materia[],
  affectedIds: string[],
) =>
  materias
    .filter((materia) => affectedIds.includes(materia.id))
    .reduce((sum, materia) => sum + materia.creditos, 0)
