export interface Programa {
  id: string
  codigo: string
  nombre: string
  totalCreditos: number
  activo: boolean
}

export interface InscripcionPrograma {
  id: string
  estudianteId: string
  programaId: string
  esPrincipal: boolean
  fechaInscripcion: string
}

export interface VersionMalla {
  id: string
  programaId: string
  nombreVersion: string
  anioVigencia: number
  activa: boolean
}

export interface Materia {
  id: string
  versionMallaId: string
  codigo: string
  nombre: string
  creditos: number
  semestreSugerido: number
  electiva: boolean
  areaOpcional?: string
  descripcionOpcional?: string
}

export type DependencyType = 'prerequisito' | 'correquisito'

export interface DependenciaMateria {
  id: string
  materiaId: string
  materiaRequeridaId: string
  tipo: DependencyType
}

export type CourseStatus =
  | 'aprobada'
  | 'reprobada'
  | 'en_curso'
  | 'pendiente'
  | 'disponible'
  | 'bloqueada'

export interface HistorialAcademico {
  id: string
  estudianteId: string
  materiaId: string
  estado: CourseStatus
  semestreCursado?: number
  actualizadoEn: string
}

export interface CourseWithState extends Materia {
  estado: CourseStatus
  prerequisitos: Materia[]
  correquisitos: Materia[]
  dependientes: Materia[]
}

export interface CurriculumGraphPayload {
  programa: Programa
  version: VersionMalla
  materias: CourseWithState[]
  dependencias: DependenciaMateria[]
}

export interface ProgressSummary {
  totalCreditos: number
  creditosAprobados: number
  porcentajeAvance: number
  promedioAcumulado: number | null
  aprobadas: number
  enCurso: number
  bloqueadas: number
  semestreEstimadoGraduacion: number
  semestresRestantesEstimados: number
  cargaMaximaCreditos: number
  disponiblesProximoSemestre: CourseWithState[]
  avancePorSemestre: Array<{ semestre: string; aprobados: number }>
  alertas: string[]
}

export interface DoubleProgramOverview {
  principal: {
    programa: Programa
    progreso: ProgressSummary
  }
  secundario?: {
    programa: Programa
    progreso: ProgressSummary
  }
  materiasCompartidas: string[]
}
