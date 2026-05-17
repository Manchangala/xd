export type ProcessingStatus =
  | 'pendiente'
  | 'extrayendo_texto'
  | 'ocr'
  | 'procesando'
  | 'validando'
  | 'convertido_a_grafo'
  | 'error'

export interface DocumentoMalla {
  id: string
  programaId: string
  nombreArchivo: string
  tipoArchivo: string
  estadoProcesamiento: ProcessingStatus
  porcentajeProgreso: number
  fechaCarga: string
}

export interface ExtraccionDocumento {
  id: string
  documentoMallaId: string
  textoExtraido: string
  metodoExtraccion: 'texto_pdf' | 'ocr_imagen' | 'mixto'
  confianzaOcr: number
  fechaProcesamiento: string
}

export interface ChunkDocumento {
  id: string
  documentoMallaId: string
  contenido: string
  orden: number
  fuente: string
}

export interface DetectedCourse {
  codigo: string
  nombre: string
  creditos: number
  semestre: number
  confianza: number
}

export interface DetectedDependency {
  materia: string
  requiere: string
  tipo: 'prerequisito' | 'correquisito'
  confianza: number
}

export interface PdfProcessingDiagnostics {
  pageCount: number
  pagesWithNativeText: number
  pagesUsingOcr: number
  pagesWithoutText: number
  scannedLike: boolean
  ocrAvailable: boolean
  ocrLanguageUsed?: string
  canRetryWithOcr: boolean
  recommendedAction: 'review' | 'manual_review' | 'install_ocr_and_retry'
  message: string
}

export interface OcrStatus {
  available: boolean
  engine?: string
  installedPath?: string
  languages: string[]
  spanishLanguageAvailable: boolean
  readyForScannedPdfs: boolean
  issues: string[]
  nextSteps: string[]
  message: string
}
