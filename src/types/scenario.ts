import type { CourseStatus } from './curriculum'

export interface Escenario {
  id: string
  estudianteId: string
  nombre: string
  descripcion: string
  creadoEn: string
  actualizadoEn: string
}

export type ScenarioEventType = 'perdida' | 'cancelacion' | 'aplazamiento' | 'aprobacion'

export interface EventoEscenario {
  id: string
  escenarioId: string
  materiaId: string
  tipoEvento: ScenarioEventType
}

export interface ResultadoEscenario {
  id: string
  escenarioId: string
  materiaId: string
  estadoSimulado: CourseStatus
}

export type Difficulty = 'baja' | 'media' | 'alta'
export type Workload = 'baja' | 'media' | 'alta'

export interface RutaAlternativa {
  id: string
  escenarioId: string
  nombre: string
  orden: number
  semestreEstimadoGraduacion: number
  duracionEstimada: number
  dificultad: Difficulty
  cargaTrabajo: Workload
  descripcion: string
}

export interface PasoRuta {
  id: string
  rutaId: string
  materiaId: string
  semestreSugerido: number
  orden: number
}

export interface ScenarioSnapshot {
  escenario: Escenario
  eventos: EventoEscenario[]
  resultados: ResultadoEscenario[]
  rutas: RutaAlternativa[]
  pasosRuta: PasoRuta[]
  resumen: {
    materiasBloqueadas: number
    creditosDisponibles: number
    semestreEstimadoGraduacion: number
    creditosPromedioSemestre: number
    promedioProyectado: number
    cargaTrabajo: Workload
  }
}
