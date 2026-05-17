import type {
  CourseStatus,
  CourseWithState,
  DependenciaMateria,
  HistorialAcademico,
  Materia,
} from '@/types/curriculum'

export const obtenerPrerequisitos = (
  materiaId: string,
  dependencias: DependenciaMateria[],
) =>
  dependencias
    .filter((dependency) => dependency.materiaId === materiaId)
    .filter((dependency) => dependency.tipo === 'prerequisito')
    .map((dependency) => dependency.materiaRequeridaId)

export const obtenerCorrequisitos = (
  materiaId: string,
  dependencias: DependenciaMateria[],
) =>
  dependencias
    .filter((dependency) => dependency.materiaId === materiaId)
    .filter((dependency) => dependency.tipo === 'correquisito')
    .map((dependency) => dependency.materiaRequeridaId)

export const obtenerDependientes = (
  materiaId: string,
  dependencias: DependenciaMateria[],
) =>
  dependencias
    .filter((dependency) => dependency.materiaRequeridaId === materiaId)
    .map((dependency) => dependency.materiaId)

export const getExplicitStatus = (
  historial: HistorialAcademico[],
  materiaId: string,
): CourseStatus | undefined => historial.find((item) => item.materiaId === materiaId)?.estado

export const deriveCourseStatus = (
  materiaId: string,
  historial: HistorialAcademico[],
  dependencias: DependenciaMateria[],
): CourseStatus => {
  const explicit = getExplicitStatus(historial, materiaId)
  if (explicit === 'aprobada' || explicit === 'en_curso' || explicit === 'reprobada') {
    return explicit
  }

  const prerequisitos = obtenerPrerequisitos(materiaId, dependencias)
  const allApproved = prerequisitos.every(
    (id) => getExplicitStatus(historial, id) === 'aprobada',
  )

  return allApproved ? 'disponible' : 'bloqueada'
}

export const buildCoursesWithState = (
  materias: Materia[],
  dependencias: DependenciaMateria[],
  historial: HistorialAcademico[],
): CourseWithState[] =>
  materias.map((materia) => {
    const prereqIds = obtenerPrerequisitos(materia.id, dependencias)
    const coreqIds = obtenerCorrequisitos(materia.id, dependencias)
    const dependentIds = obtenerDependientes(materia.id, dependencias)

    return {
      ...materia,
      estado: deriveCourseStatus(materia.id, historial, dependencias),
      prerequisitos: materias.filter((item) => prereqIds.includes(item.id)),
      correquisitos: materias.filter((item) => coreqIds.includes(item.id)),
      dependientes: materias.filter((item) => dependentIds.includes(item.id)),
    }
  })

export const calcularProgreso = (
  materias: Materia[],
  historial: HistorialAcademico[],
  totalCreditos: number,
) => {
  const approvedIds = new Set(
    historial.filter((item) => item.estado === 'aprobada').map((item) => item.materiaId),
  )
  const creditosAprobados = materias
    .filter((materia) => approvedIds.has(materia.id))
    .reduce((sum, materia) => sum + materia.creditos, 0)
  return {
    creditosAprobados,
    porcentajeAvance: (creditosAprobados / totalCreditos) * 100,
  }
}

export const materiasDisponibles = (
  materias: CourseWithState[],
) => materias.filter((materia) => materia.estado === 'disponible')
