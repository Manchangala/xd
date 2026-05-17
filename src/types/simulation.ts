import type { HistorialAcademico } from './curriculum'
import type { RutaAlternativa, ScenarioEventType } from './scenario'

export interface SimulationEvent {
  materiaId: string
  tipoEvento: Exclude<ScenarioEventType, 'aprobacion'>
}

export interface SimulationResult {
  evento: SimulationEvent
  historialOriginal: HistorialAcademico[]
  historialSimulado: HistorialAcademico[]
  materiasBloqueadas: string[]
  materiasBloqueadasDirectas: string[]
  materiasBloqueadasIndirectas: string[]
  impactoCreditos: number
  creditosDisponiblesAntes: number
  creditosDisponiblesDespues: number
  semestreEstimadoAntes: number
  semestreEstimadoDespues: number
  explicacion: string
  rutas: RutaAlternativa[]
}
