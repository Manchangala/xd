import { mockAdapter } from '@/lib/api/mockAdapter'
import { apiClient } from '@/lib/api/apiClient'
import { endpoints } from '@/lib/api/endpoints'
import { shouldUseApi } from '@/lib/api/config'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage/localStorage'
import { uid } from '@/lib/utils'
import {
  detectedCoursesMock,
  detectedDependenciesMock,
} from '@/mocks/pdf.mock'
import type {
  ChunkDocumento,
  DetectedCourse,
  DetectedDependency,
  DocumentoMalla,
  ExtraccionDocumento,
  OcrStatus,
  PdfProcessingDiagnostics,
} from '@/types/pdf'

const isExplicitDemoFile = (fileName: string) =>
  ['demo', 'ejemplo', 'mock', 'simulada'].some((token) =>
    fileName.includes(token),
  )

const isImageLikeFile = (fileName: string) =>
  ['imagen', 'foto', 'captura', 'screenshot', 'escanead', 'scan'].some((token) =>
    fileName.includes(token),
  )

const acceptedCurriculumFileTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const acceptedCurriculumFileExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']

const unsupportedFileMessage =
  'Solo se permiten archivos PDF o imágenes JPG, PNG y WebP'

const isSupportedCurriculumFile = (file: File) => {
  const normalizedName = file.name.toLowerCase()
  return (
    acceptedCurriculumFileTypes.includes(file.type) ||
    acceptedCurriculumFileExtensions.some((extension) =>
      normalizedName.endsWith(extension),
    )
  )
}

export const pdfIngestionService = {
  getOcrStatus() {
    if (shouldUseApi()) {
      return apiClient.get<OcrStatus>(endpoints.admin.ocrStatus)
    }
    return mockAdapter(() => ({
      available: false,
      engine: undefined,
      installedPath: undefined,
      languages: [],
      spanishLanguageAvailable: false,
      readyForScannedPdfs: false,
      issues: ['El OCR real no se evalúa en modo mock.'],
      nextSteps: [
        'Cambia la fuente de datos a API real para consultar el estado local del OCR.',
      ],
      message: 'OCR local no conectado en modo mock.',
    }))
  },
  uploadPdf(file: File, programId: string) {
    if (shouldUseApi()) {
      const payload = new FormData()
      payload.append('file', file)
      payload.append('program_id', programId)
      return apiClient.postForm<DocumentoMalla>(
        `${endpoints.documents}/upload`,
        payload,
      )
    }
    return mockAdapter(() => {
      if (!isSupportedCurriculumFile(file)) {
        throw new Error(unsupportedFileMessage)
      }
      const documents = readStorage<DocumentoMalla[]>(STORAGE_KEYS.documents, [])
      const document: DocumentoMalla = {
        id: uid('doc'),
        programaId: programId,
        nombreArchivo: file.name,
        tipoArchivo: file.type,
        estadoProcesamiento: 'pendiente',
        porcentajeProgreso: 0,
        fechaCarga: new Date().toISOString(),
      }
      writeStorage(STORAGE_KEYS.documents, [...documents, document])
      return document
    })
  },
  processPdf(documentId: string) {
    if (shouldUseApi()) {
      return apiClient.post<
        Record<string, never>,
        {
          document: DocumentoMalla
          extraction: ExtraccionDocumento
          courses: typeof detectedCoursesMock
          dependencies: typeof detectedDependenciesMock
          diagnostics: PdfProcessingDiagnostics
        }
      >(`${endpoints.documents}/${documentId}/process`, {})
    }
    return mockAdapter(() => {
      const documents = readStorage<DocumentoMalla[]>(STORAGE_KEYS.documents, [])
      const currentDocument = documents.find((item) => item.id === documentId)
      if (!currentDocument) {
        throw new Error('Documento no encontrado')
      }

      const normalizedName = currentDocument.nombreArchivo.toLowerCase()
      const hasNoText = normalizedName.includes('sin-texto')
      const hasMissingCode = normalizedName.includes('sin-codigo')
      const isDemo = isExplicitDemoFile(normalizedName)
      const isImageLike =
        isImageLikeFile(normalizedName) || currentDocument.tipoArchivo.startsWith('image/')
      const shouldReturnDemoDetections = isDemo && !hasNoText

      const next = documents.map((item) =>
        item.id === documentId
          ? {
              ...item,
              estadoProcesamiento: shouldReturnDemoDetections
                ? ('validando' as const)
                : ('error' as const),
              porcentajeProgreso: 100,
            }
          : item,
      )
      writeStorage(STORAGE_KEYS.documents, next)

      const extraction: ExtraccionDocumento = {
        id: uid('extract'),
        documentoMallaId: documentId,
        textoExtraido: shouldReturnDemoDetections
          ? 'Texto demo simulado: se detectaron materias, créditos, semestres y dependencias de ejemplo. Este resultado no proviene del archivo cargado.'
          : '',
        metodoExtraccion: isImageLike ? 'ocr_imagen' : 'mixto',
        confianzaOcr: shouldReturnDemoDetections ? (isImageLike ? 0.78 : 0.91) : 0,
        fechaProcesamiento: new Date().toISOString(),
      }

      const chunks: ChunkDocumento[] = shouldReturnDemoDetections
        ? [
            {
              id: uid('chunk'),
              documentoMallaId: documentId,
              contenido: 'Cadena de programación demo detectada automáticamente.',
              orden: 1,
              fuente: 'Página 1 · demo',
            },
          ]
        : []

      writeStorage(STORAGE_KEYS.extractions, [
        ...readStorage<ExtraccionDocumento[]>(STORAGE_KEYS.extractions, []),
        extraction,
      ])
      writeStorage(STORAGE_KEYS.chunks, [
        ...readStorage<ChunkDocumento[]>(STORAGE_KEYS.chunks, []),
        ...chunks,
      ])

      const detectedCourses = shouldReturnDemoDetections
        ? hasMissingCode
          ? detectedCoursesMock.map((course, index) =>
              index === 0 ? { ...course, codigo: '' } : course,
            )
          : detectedCoursesMock
        : []
      const detectedDependencies = shouldReturnDemoDetections
        ? detectedDependenciesMock
        : []

      const updatedDocument = next.find((item) => item.id === documentId)
      if (!updatedDocument) {
        throw new Error('No se pudo actualizar el documento')
      }

      const diagnostics: PdfProcessingDiagnostics = {
        pageCount: shouldReturnDemoDetections ? 1 : 0,
        pagesWithNativeText: shouldReturnDemoDetections && !isImageLike ? 1 : 0,
        pagesUsingOcr: shouldReturnDemoDetections && isImageLike ? 1 : 0,
        pagesWithoutText: shouldReturnDemoDetections ? 0 : 1,
        scannedLike: isImageLike,
        ocrAvailable: false,
        ocrLanguageUsed: shouldReturnDemoDetections && isImageLike ? 'spa' : undefined,
        canRetryWithOcr: !shouldReturnDemoDetections && isImageLike,
        recommendedAction:
          !shouldReturnDemoDetections && isImageLike
            ? 'install_ocr_and_retry'
          : !shouldReturnDemoDetections
            ? 'manual_review'
            : 'review',
        message: shouldReturnDemoDetections
          ? 'Resultado demo generado en modo local. Úsalo solo para probar la interfaz; no proviene del archivo cargado.'
          : isImageLike
            ? 'El archivo parece ser una captura, foto o PDF escaneado. En modo local/mock no se lee el contenido real; cambia a API real y configura OCR local para procesarlo.'
            : 'En modo local/mock no se lee el contenido real del archivo. Cambia a API real para extraer texto y detectar materias.',
      }

      return {
        document: updatedDocument,
        extraction,
        courses: detectedCourses,
        dependencies: detectedDependencies,
        diagnostics,
      }
    }, { delay: 650 })
  },
  approveGraph(
    documentId: string,
    payload?: {
      versionId: string
      courses: DetectedCourse[]
      dependencies: DetectedDependency[]
    },
  ) {
    if (shouldUseApi()) {
      if (!payload) {
        throw new Error('Se requiere la versión de malla y la revisión aprobada')
      }
      return apiClient.post<
        {
          versionId: string
          courses: DetectedCourse[]
          dependencies: DetectedDependency[]
        },
        {
          documentId: string
          approved: boolean
          createdCourses: number
          updatedCourses: number
          createdDependencies: number
          message: string
        }
      >(`${endpoints.documents}/${documentId}/approve-graph`, payload)
    }
    return mockAdapter(() => ({
      documentId,
      approved: true,
      createdCourses: payload?.courses.length ?? 0,
      updatedCourses: 0,
      createdDependencies: payload?.dependencies.length ?? 0,
      message: 'Grafo aprobado y listo para guardar en backend futuro.',
    }))
  },
}
