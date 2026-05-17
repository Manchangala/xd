import type {
  ChunkDocumento,
  DetectedCourse,
  DetectedDependency,
  DocumentoMalla,
  ExtraccionDocumento,
} from '@/types/pdf'

export const documentosMock: DocumentoMalla[] = [
  {
    id: 'doc_1',
    programaId: 'prog_systems',
    nombreArchivo: 'malla_ingenieria_sistemas_2025.pdf',
    tipoArchivo: 'application/pdf',
    estadoProcesamiento: 'convertido_a_grafo',
    porcentajeProgreso: 100,
    fechaCarga: '2026-05-09T09:00:00.000Z',
  },
]

export const extraccionesMock: ExtraccionDocumento[] = [
  {
    id: 'extract_1',
    documentoMallaId: 'doc_1',
    textoExtraido:
      'MAT101 Cálculo Diferencial 4 créditos. MAT102 Cálculo Integral 4 créditos. INF101 Programación I 4 créditos. INF102 Programación II 4 créditos. INF201 Estructuras de Datos 4 créditos. INF202 Bases de Datos 4 créditos.',
    metodoExtraccion: 'mixto',
    confianzaOcr: 0.94,
    fechaProcesamiento: '2026-05-09T09:03:00.000Z',
  },
]

export const chunksMock: ChunkDocumento[] = [
  {
    id: 'chunk_1',
    documentoMallaId: 'doc_1',
    contenido: 'Bloque matemático: MAT101, MAT102, MAT201, EST201.',
    orden: 1,
    fuente: 'Página 1',
  },
  {
    id: 'chunk_2',
    documentoMallaId: 'doc_1',
    contenido:
      'Cadena de programación: INF101 -> INF102 -> INF201 -> INF202 -> INF301.',
    orden: 2,
    fuente: 'Página 2',
  },
]

export const detectedCoursesMock: DetectedCourse[] = [
  ['MAT101', 'Cálculo Diferencial', 4, 1, 0.99],
  ['MAT102', 'Cálculo Integral', 4, 2, 0.97],
  ['INF101', 'Programación I', 4, 1, 0.99],
  ['INF102', 'Programación II', 4, 2, 0.98],
  ['INF201', 'Estructuras de Datos', 4, 3, 0.95],
  ['INF202', 'Bases de Datos', 4, 4, 0.96],
].map(([codigo, nombre, creditos, semestre, confianza]) => ({
  codigo: codigo as string,
  nombre: nombre as string,
  creditos: creditos as number,
  semestre: semestre as number,
  confianza: confianza as number,
}))

export const detectedDependenciesMock: DetectedDependency[] = [
  ['MAT102', 'MAT101', 'prerequisito', 0.98],
  ['INF102', 'INF101', 'prerequisito', 0.99],
  ['INF201', 'INF102', 'prerequisito', 0.97],
  ['INF202', 'INF201', 'prerequisito', 0.96],
].map(([materia, requiere, tipo, confianza]) => ({
  materia: materia as string,
  requiere: requiere as string,
  tipo: tipo as DetectedDependency['tipo'],
  confianza: confianza as number,
}))
