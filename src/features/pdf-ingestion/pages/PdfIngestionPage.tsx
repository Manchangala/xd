import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileText, RefreshCcw, UploadCloud } from 'lucide-react'
import { AccessDenied } from '@/components/ui/access'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/useToast'
import { CurriculumGraph } from '@/components/graph/CurriculumGraph'
import { pdfIngestionService } from '@/features/pdf-ingestion/services/pdfIngestionService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { adminService } from '@/features/admin/services/adminService'
import { getAppSettings } from '@/lib/api/config'
import type { CourseWithState } from '@/types/curriculum'
import type {
  DetectedCourse,
  DetectedDependency,
  DocumentoMalla,
  ExtraccionDocumento,
  PdfProcessingDiagnostics,
} from '@/types/pdf'

const pipeline = [
  'Archivo cargado',
  'Extracción de texto',
  'OCR si es imagen o escaneo',
  'Procesamiento de materias',
  'Detección de prerrequisitos/correquisitos',
  'Construcción del grafo',
  'Validación manual',
  'Guardado como malla',
]

const acceptedCurriculumFileTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const acceptedCurriculumFileExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']

const acceptedFileInput = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
].join(',')

const unsupportedFileMessage =
  'Solo se permiten archivos PDF o imágenes JPG, PNG y WebP'

const isSupportedCurriculumFile = (selectedFile: File) => {
  const lowerName = selectedFile.name.toLowerCase()
  return (
    acceptedCurriculumFileTypes.includes(selectedFile.type) ||
    acceptedCurriculumFileExtensions.some((extension) =>
      lowerName.endsWith(extension),
    )
  )
}

interface ReviewCourse extends DetectedCourse {
  id: string
}

interface ReviewDependency extends DetectedDependency {
  id: string
}

const normalizeCode = (value: string) => value.trim().toUpperCase()

const hasDuplicateCourseCodes = (courses: ReviewCourse[]) => {
  const codes = courses.map((course) => normalizeCode(course.codigo)).filter(Boolean)
  return new Set(codes).size !== codes.length
}

const hasDuplicateDependencies = (dependencies: ReviewDependency[]) => {
  const keys = dependencies.map(
    (dependency) =>
      `${normalizeCode(dependency.materia)}:${normalizeCode(dependency.requiere)}:${dependency.tipo}`,
  )
  return new Set(keys).size !== keys.length
}

const hasPrerequisiteCycle = (dependencies: ReviewDependency[]) => {
  const adjacency = new Map<string, Set<string>>()
  dependencies
    .filter((dependency) => dependency.tipo === 'prerequisito')
    .forEach((dependency) => {
      const course = normalizeCode(dependency.materia)
      const required = normalizeCode(dependency.requiere)
      if (!course || !required) return
      const current = adjacency.get(course) ?? new Set<string>()
      current.add(required)
      adjacency.set(course, current)
    })

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (course: string): boolean => {
    if (visiting.has(course)) return true
    if (visited.has(course)) return false
    visiting.add(course)
    for (const required of adjacency.get(course) ?? []) {
      if (visit(required)) return true
    }
    visiting.delete(course)
    visited.add(course)
    return false
  }

  return [...adjacency.keys()].some((course) => visit(course))
}

const recommendedActionLabel: Record<
  PdfProcessingDiagnostics['recommendedAction'],
  string
> = {
  review: 'Revisar detecciones',
  manual_review: 'Revisión manual',
  install_ocr_and_retry: 'Configurar OCR y reintentar',
}

export function PdfIngestionPage() {
  const role = useAuthStore((state) => state.session?.user.rol)
  const { pushToast } = useToast()
  const dataSource = useMemo(() => getAppSettings().dataSource, [])
  const ocrStatus = useQuery({
    queryKey: ['ocr-status'],
    queryFn: () => pdfIngestionService.getOcrStatus(),
  })
  const catalog = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminService.getDashboardData,
  })
  const [file, setFile] = useState<File | null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [progress, setProgress] = useState(0)
  const [processingResult, setProcessingResult] = useState<{
    document: DocumentoMalla
    extraction: ExtraccionDocumento
    courses: DetectedCourse[]
    dependencies: DetectedDependency[]
    diagnostics: PdfProcessingDiagnostics
  } | null>(null)
  const [currentDocumentId, setCurrentDocumentId] = useState<string>()
  const [reviewCourses, setReviewCourses] = useState<ReviewCourse[]>([])
  const [reviewDependencies, setReviewDependencies] = useState<
    ReviewDependency[]
  >([])
  const [isReviewing, setIsReviewing] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activePrograms = useMemo(
    () => catalog.data?.programas.filter((program) => program.activo) ?? [],
    [catalog.data],
  )
  const programsById = useMemo(
    () => new Map(catalog.data?.programas.map((program) => [program.id, program]) ?? []),
    [catalog.data],
  )
  const programId =
    activePrograms.find((program) => program.id === selectedProgramId)?.id ??
    activePrograms[0]?.id ??
    ''
  const availableVersions = useMemo(
    () =>
      catalog.data?.versiones.filter((version) => version.programaId === programId) ??
      [],
    [catalog.data, programId],
  )
  const versionId =
    availableVersions.find((version) => version.id === selectedVersionId)?.id ??
    availableVersions.find((version) => version.activa)?.id ??
    availableVersions[0]?.id ??
    ''

  const applyProcessingResult = (result: {
    document: DocumentoMalla
    extraction: ExtraccionDocumento
    courses: DetectedCourse[]
    dependencies: DetectedDependency[]
    diagnostics: PdfProcessingDiagnostics
  }) => {
    setProgress(result.document.porcentajeProgreso)
    setProcessingResult(result)
    setCurrentDocumentId(result.document.id)
    setReviewCourses(
      result.courses.map((course, index) => ({
        ...course,
        id: `review_course_${index}`,
      })),
    )
    setReviewDependencies(
      result.dependencies.map((dependency, index) => ({
        ...dependency,
        id: `review_dependency_${index}`,
      })),
    )
    setApproved(false)
    setIsReviewing(false)
  }

  const processExistingDocument = async (documentId: string) => {
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 12, 96))
    }, 180)
    try {
      const result = await pdfIngestionService.processPdf(documentId)
      applyProcessingResult(result)
      return result
    } finally {
      window.clearInterval(timer)
    }
  }

  const uploadAndProcess = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecciona un PDF o una imagen')
      setError(null)
      const uploaded = await pdfIngestionService.uploadPdf(file, programId)
      setCurrentDocumentId(uploaded.id)
      return processExistingDocument(uploaded.id)
    },
    onSuccess: (result) => {
      const hasExtractedText = result.extraction.textoExtraido.trim().length > 0
      if (!hasExtractedText) {
        pushToast({
          title: 'No se pudo extraer texto real',
          description: result.diagnostics.message,
        })
        return
      }
      if (!result.courses.length) {
        pushToast({
          title: 'Texto extraído sin materias detectadas',
          description:
            'Revisa el texto o corrige manualmente antes de guardar el grafo.',
        })
        return
      }
      pushToast({
        title:
          dataSource === 'mock'
            ? 'Resultado demo generado'
            : 'Archivo procesado',
        description:
          dataSource === 'mock'
            ? 'Las detecciones pertenecen al modo demo y no al archivo cargado.'
            : 'Extracción completada y grafo listo para validación.',
      })
    },
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : 'Error'),
  })

  const retryProcessing = useMutation({
    mutationFn: async () => {
      if (!currentDocumentId) throw new Error('No hay documento para reprocesar')
      setError(null)
      setProgress(0)
      return processExistingDocument(currentDocumentId)
    },
    onSuccess: () =>
      pushToast({
        title: 'Reintento completado',
        description:
          'El mismo archivo se procesó nuevamente con la configuración actual.',
      }),
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : 'Error'),
  })

  const previewCourses = useMemo<CourseWithState[]>(
    () =>
      reviewCourses.map((course) => ({
        id: `preview_${course.id}`,
        versionMallaId: versionId,
        codigo: course.codigo,
        nombre: course.nombre,
        creditos: course.creditos,
        semestreSugerido: course.semestre,
        electiva: false,
        estado: 'disponible',
        prerequisitos: [],
        correquisitos: [],
        dependientes: [],
      })),
    [reviewCourses, versionId],
  )
  const previewCourseIdsByCode = new Map(
    previewCourses.map((course) => [course.codigo, course.id]),
  )
  const previewDependencies = reviewDependencies
    .map((dependency) => ({
      id: `preview_dep_${dependency.id}`,
      materiaId: previewCourseIdsByCode.get(dependency.materia),
      materiaRequeridaId: previewCourseIdsByCode.get(dependency.requiere),
      tipo: dependency.tipo,
    }))
    .filter(
      (
        dependency,
      ): dependency is {
        id: string
        materiaId: string
        materiaRequeridaId: string
        tipo: DetectedDependency['tipo']
      } => Boolean(dependency.materiaId && dependency.materiaRequeridaId),
    )
  const detectedCodes = new Set(
    reviewCourses.map((course) => normalizeCode(course.codigo)).filter(Boolean),
  )
  const blockingIssues = processingResult
    ? [
        !processingResult.extraction.textoExtraido.trim()
          ? 'No se pudo extraer texto'
          : null,
        processingResult.extraction.textoExtraido.trim() && reviewCourses.length === 0
          ? 'No se detectaron materias en el texto extraído'
          : null,
        reviewCourses.some((course) => !course.codigo.trim())
          ? 'Hay materias sin c?digo'
          : null,
        hasDuplicateCourseCodes(reviewCourses)
          ? 'Hay materias con c?digos duplicados'
          : null,
        reviewDependencies.some(
          (dependency) =>
            !detectedCodes.has(normalizeCode(dependency.materia)) ||
            !detectedCodes.has(normalizeCode(dependency.requiere)),
        )
          ? 'Hay dependencias con materias no reconocidas'
          : null,
        reviewDependencies.some(
          (dependency) =>
            normalizeCode(dependency.materia) === normalizeCode(dependency.requiere),
        )
          ? 'Hay dependencias autorreferenciadas'
          : null,
        hasDuplicateDependencies(reviewDependencies)
          ? 'Hay dependencias duplicadas'
          : null,
        hasPrerequisiteCycle(reviewDependencies)
          ? 'Hay ciclos de prerrequisitos'
          : null,
        processingResult.extraction.metodoExtraccion === 'ocr_imagen' &&
        !processingResult.extraction.textoExtraido.trim() &&
        !ocrStatus.data?.available
          ? 'OCR local no disponible para procesar imágenes o PDFs escaneados'
          : null,
      ].filter((issue): issue is string => Boolean(issue))
    : []
  const warningIssues = processingResult
    ? [
        processingResult.extraction.confianzaOcr < 0.95
          ? 'OCR con baja confianza'
          : null,
      ].filter((issue): issue is string => Boolean(issue))
    : []
  const ocrIssues = ocrStatus.data?.issues ?? []
  const ocrNextSteps = ocrStatus.data?.nextSteps ?? []
  const ocrLanguages = ocrStatus.data?.languages ?? []
  const hasProcessingError =
    processingResult?.document.estadoProcesamiento === 'error'

  if (role !== 'admin') return <AccessDenied role="administrador" />
  if (catalog.isLoading) return <LoadingBlock />
  if (catalog.isError || !catalog.data) {
    return <ErrorState message="No se pudo cargar el catálogo administrativo." />
  }

  return (
    <>
      <PageHeader
        eyebrow="PDF / imagen / OCR"
        title="Carga inteligente de malla curricular"
        description="Sube un PDF, captura o foto de la malla; el flujo extrae texto, usa OCR cuando aplica y prepara el grafo para revisión."
      />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          {dataSource === 'mock' ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-semibold">Modo demo/local activo</p>
              <p className="mt-1">
                En este modo no se lee el contenido real del archivo. Para procesar una
                malla escaneada, foto o captura como la que subiste, cambia la fuente
                de datos a API real y configura OCR local.
              </p>
            </div>
          ) : null}
          <div
            className="rounded-3xl border-2 border-dashed border-slate-300 p-6 text-center dark:border-slate-700"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const dropped = event.dataTransfer.files[0]
              if (!dropped) return
              if (dropped && !isSupportedCurriculumFile(dropped)) {
                setError(unsupportedFileMessage)
                return
              }
              setFile(dropped)
              setError(null)
              setProgress(0)
              setProcessingResult(null)
              setCurrentDocumentId(undefined)
              setReviewCourses([])
              setReviewDependencies([])
              setIsReviewing(false)
              setApproved(false)
            }}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-brand-700" />
            <p className="mt-3 font-semibold">Arrastra tu PDF o imagen aquí</p>
            <p className="mt-1 text-sm text-slate-500">o selecciónalo manualmente</p>
            <input
              className="mt-4 block w-full text-sm"
              type="file"
              accept={acceptedFileInput}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                if (selected && !isSupportedCurriculumFile(selected)) {
                  setError(unsupportedFileMessage)
                  return
                }
                setFile(selected)
                setError(null)
                setProgress(0)
                setProcessingResult(null)
                setCurrentDocumentId(undefined)
                setReviewCourses([])
                setReviewDependencies([])
                setIsReviewing(false)
                setApproved(false)
              }}
            />
            {file ? <p className="mt-3 text-sm">{file.name}</p> : null}
          </div>
          <div className="mt-4 grid gap-3">
            <Select
              value={programId}
              onChange={(event) => {
                setSelectedProgramId(event.target.value)
                setSelectedVersionId('')
              }}
            >
              {activePrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.nombre}
                </option>
              ))}
            </Select>
            <Select
              value={versionId}
              onChange={(event) => setSelectedVersionId(event.target.value)}
            >
              {availableVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.nombreVersion} ? {programsById.get(version.programaId)?.nombre}
                </option>
              ))}
            </Select>
            {!availableVersions.length ? (
              <p className="text-sm text-amber-700">
                El programa seleccionado aún no tiene versiones de malla disponibles.
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => uploadAndProcess.mutate()}
                disabled={!file || !programId || !versionId || uploadAndProcess.isPending}
              >
                Procesar archivo
              </Button>
              <Button
                variant="outline"
                onClick={() => ocrStatus.refetch()}
                disabled={ocrStatus.isFetching}
              >
                <RefreshCcw className="h-4 w-4" />
                Actualizar diagnóstico
              </Button>
            </div>
          </div>
          <div className="mt-5">
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full transition-all ${
                  hasProcessingError ? 'bg-rose-600' : 'bg-brand-700'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{progress}% completado</span>
              {hasProcessingError ? (
                <Badge className="bg-rose-100 text-rose-700">
                  Procesamiento detenido
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">OCR local</p>
              <Badge
                className={
                  ocrStatus.data?.readyForScannedPdfs
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }
              >
                {ocrStatus.isError
                  ? 'Sin conexi?n'
                  : ocrStatus.data?.readyForScannedPdfs
                  ? 'Listo'
                  : ocrStatus.data?.available
                    ? 'Requiere ajuste'
                    : 'No detectado'}
              </Badge>
            </div>
            <p className="mt-2 text-slate-500">
              {ocrStatus.isError
                ? 'No se pudo consultar el estado OCR local.'
                : ocrStatus.data?.message ??
                  'Consultando disponibilidad del motor OCR local...'}
            </p>
            {ocrStatus.data?.engine ? (
              <p className="mt-2 text-slate-500">
                Motor: {ocrStatus.data.engine}
                {ocrStatus.data.installedPath
                  ? ` ? ${ocrStatus.data.installedPath}`
                  : ''}
              </p>
            ) : null}
            {ocrLanguages.length ? (
              <p className="mt-2 text-slate-500">
                Idiomas: {ocrLanguages.join(', ')}
              </p>
            ) : null}
            {ocrIssues.length ? (
              <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/20 dark:text-amber-100">
                {ocrIssues.map((issue) => (
                  <p key={issue}>? {issue}</p>
                ))}
              </div>
            ) : null}
            {ocrNextSteps.length ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <p className="font-semibold">Qué hacer</p>
                <div className="mt-2 space-y-1">
                  {ocrNextSteps.map((step) => (
                    <p key={step}>? {step}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {error ? (
            <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Pipeline visual</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pipeline.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <Badge
                  className={
                    hasProcessingError && progress >= ((index + 1) / pipeline.length) * 100
                      ? 'bg-rose-100 text-rose-700'
                      : progress >= ((index + 1) / pipeline.length) * 100
                        ? 'bg-emerald-100 text-emerald-700'
                        : ''
                  }
                >
                  {index + 1}
                </Badge>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-brand-700" />
            Texto extraído
          </h3>
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 dark:bg-slate-800">
            {processingResult
              ? processingResult.extraction.textoExtraido ||
                'No se pudo extraer texto del documento.'
              : 'Aún no se ha procesado un documento.'}
          </p>
          {processingResult ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>• Método: {processingResult.extraction.metodoExtraccion}</p>
              <p>
                ? Confianza OCR:{' '}
                {Math.round(processingResult.extraction.confianzaOcr * 100)}%
              </p>
              <p>
                ? Estado de revisión:{' '}
                {approved ? 'aprobado manualmente' : 'pendiente de aprobaci?n'}
              </p>
            </div>
          ) : null}
          {processingResult ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">Diagnóstico de procesamiento</p>
                <Badge>
                  {processingResult.diagnostics.scannedLike
                    ? 'Imagen o escaneo'
                    : 'Documento con texto'}
                </Badge>
              </div>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                {processingResult.diagnostics.message}
              </p>
              <p className="mt-2 text-sm font-medium text-brand-700">
                Acción recomendada:{' '}
                {recommendedActionLabel[
                  processingResult.diagnostics.recommendedAction
                ]}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>• Páginas: {processingResult.diagnostics.pageCount}</p>
                <p>
                  ? Con texto nativo:{' '}
                  {processingResult.diagnostics.pagesWithNativeText}
                </p>
                <p>• Usaron OCR: {processingResult.diagnostics.pagesUsingOcr}</p>
                <p>• Sin texto: {processingResult.diagnostics.pagesWithoutText}</p>
              </div>
              {processingResult.diagnostics.ocrLanguageUsed ? (
                <p className="mt-2 text-slate-500">
                  Idioma OCR usado: {processingResult.diagnostics.ocrLanguageUsed}
                </p>
              ) : null}
              {processingResult.diagnostics.canRetryWithOcr ? (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => retryProcessing.mutate()}
                  disabled={retryProcessing.isPending}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {retryProcessing.isPending ? 'Reintentando...' : 'Reintentar OCR'}
                </Button>
              ) : null}
            </div>
          ) : null}
          {processingResult ? (
            <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <p className="font-semibold">Alertas de validación</p>
              {blockingIssues.length || warningIssues.length ? (
                <div className="mt-3 space-y-2">
                  {blockingIssues.map((issue) => (
                    <p key={issue} className="text-rose-700">
                      ? {issue}
                    </p>
                  ))}
                  {warningIssues.map((issue) => (
                    <p key={issue} className="text-amber-700">
                      ? {issue}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-emerald-700">• Sin alertas de validación</p>
              )}
            </div>
          ) : null}
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Materias detectadas</h3>
          {processingResult ? (
            <div className="mt-4 overflow-x-auto">
              {reviewCourses.length === 0 ? (
                <EmptyState
                  title="No hay materias detectadas"
                  description="El sistema no debe inventar materias. Cambia a API real con OCR o agrega materias manualmente en la revisión."
                />
              ) : (
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3">Código</th>
                    <th className="pb-3">Nombre</th>
                    <th className="pb-3">Créditos</th>
                    <th className="pb-3">Semestre</th>
                    <th className="pb-3">Confianza</th>
                    {isReviewing ? <th className="pb-3">Acciones</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {reviewCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-3">
                        {isReviewing ? (
                          <Input
                            value={course.codigo}
                            onChange={(event) =>
                              setReviewCourses((current) =>
                                current.map((item) =>
                                  item.id === course.id
                                    ? { ...item, codigo: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        ) : (
                          course.codigo || '—'
                        )}
                      </td>
                      <td className="py-3">
                        {isReviewing ? (
                          <Input
                            value={course.nombre}
                            onChange={(event) =>
                              setReviewCourses((current) =>
                                current.map((item) =>
                                  item.id === course.id
                                    ? { ...item, nombre: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        ) : (
                          course.nombre
                        )}
                      </td>
                      <td className="py-3">
                        {isReviewing ? (
                          <Input
                            type="number"
                            value={course.creditos}
                            onChange={(event) =>
                              setReviewCourses((current) =>
                                current.map((item) =>
                                  item.id === course.id
                                    ? {
                                        ...item,
                                        creditos: Number(event.target.value),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        ) : (
                          `${course.creditos} cr.`
                        )}
                      </td>
                      <td className="py-3">
                        {isReviewing ? (
                          <Input
                            type="number"
                            value={course.semestre}
                            onChange={(event) =>
                              setReviewCourses((current) =>
                                current.map((item) =>
                                  item.id === course.id
                                    ? {
                                        ...item,
                                        semestre: Number(event.target.value),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        ) : (
                          `Sem. ${course.semestre}`
                        )}
                      </td>
                      <td className="py-3">{Math.round(course.confianza * 100)}%</td>
                      {isReviewing ? (
                        <td className="py-3">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              setReviewCourses((current) =>
                                current.filter((item) => item.id !== course.id),
                              )
                            }
                          >
                            Quitar
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
              {isReviewing ? (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() =>
                    setReviewCourses((current) => [
                      ...current,
                      {
                        id: `review_course_${Date.now()}`,
                        codigo: '',
                        nombre: 'Nueva materia',
                        creditos: 3,
                        semestre: 1,
                        confianza: 1,
                      },
                    ])
                  }
                >
                  Añadir materia
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Sin detecciones aún"
                description="Procesa un PDF o imagen para revisar las materias encontradas."
              />
            </div>
          )}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h3 className="text-lg font-semibold">Dependencias detectadas</h3>
          {processingResult ? (
            <div className="mt-4 space-y-3">
              {reviewDependencies.length === 0 ? (
                <EmptyState
                  title="No hay dependencias detectadas"
                  description="Cuando el documento no trae texto real o no hay OCR, las relaciones deben corregirse manualmente."
                />
              ) : null}

              {reviewDependencies.map((dependency) => (
                <div
                  key={dependency.id}
                  className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800"
                >
                  {isReviewing ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          value={dependency.materia}
                          onChange={(event) =>
                            setReviewDependencies((current) =>
                              current.map((item) =>
                                item.id === dependency.id
                                  ? { ...item, materia: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <Input
                          value={dependency.requiere}
                          onChange={(event) =>
                            setReviewDependencies((current) =>
                              current.map((item) =>
                                item.id === dependency.id
                                  ? { ...item, requiere: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <Select
                          value={dependency.tipo}
                          onChange={(event) =>
                            setReviewDependencies((current) =>
                              current.map((item) =>
                                item.id === dependency.id
                                  ? {
                                      ...item,
                                      tipo: event.target
                                        .value as DetectedDependency['tipo'],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="prerequisito">Prerrequisito</option>
                          <option value="correquisito">Correquisito</option>
                        </Select>
                        <Button
                          variant="danger"
                          onClick={() =>
                            setReviewDependencies((current) =>
                              current.filter((item) => item.id !== dependency.id),
                            )
                          }
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {dependency.materia} requiere {dependency.requiere} ·{' '}
                      {dependency.tipo} · {Math.round(dependency.confianza * 100)}%
                    </>
                  )}
                </div>
              ))}
              {isReviewing ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setReviewDependencies((current) => [
                      ...current,
                      {
                        id: `review_dependency_${Date.now()}`,
                        materia: reviewCourses[0]?.codigo ?? '',
                        requiere: reviewCourses[1]?.codigo ?? '',
                        tipo: 'prerequisito',
                        confianza: 1,
                      },
                    ])
                  }
                >
                  Añadir dependencia
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Sin dependencias aún"
                description="Las relaciones aparecerán después del procesamiento."
              />
            </div>
          )}
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              disabled={!processingResult}
              onClick={() => {
                setIsReviewing((current) => !current)
                setApproved(false)
              }}
            >
              {isReviewing ? 'Cerrar revisión' : 'Corregir'}
            </Button>
            <Button
              variant="outline"
              disabled={!processingResult || blockingIssues.length > 0}
              onClick={() => {
                setApproved(true)
                setIsReviewing(false)
                pushToast({ title: 'Resultado aprobado manualmente' })
              }}
            >
              Aprobar
            </Button>
            <Button
              disabled={!processingResult || !approved || blockingIssues.length > 0}
              onClick={async () => {
                if (!processingResult) return
                try {
                  await pdfIngestionService.approveGraph(
                    processingResult.extraction.documentoMallaId,
                    {
                      versionId,
                      courses: reviewCourses,
                      dependencies: reviewDependencies,
                    },
                  )
                  setProgress(100)
                  pushToast({ title: 'Grafo guardado' })
                } catch (saveError) {
                  setError(
                    saveError instanceof Error
                      ? saveError.message
                      : 'No se pudo guardar el grafo',
                  )
                  pushToast({
                    title: 'No se pudo guardar el grafo',
                    description:
                      saveError instanceof Error
                        ? saveError.message
                        : 'Revisa la validación manual antes de intentar de nuevo.',
                  })
                }
              }}
            >
              Guardar grafo
            </Button>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Vista previa del grafo</h3>
          {processingResult && previewCourses.length > 0 ? (
            <CurriculumGraph
              courses={previewCourses}
              dependencies={previewDependencies}
            />
          ) : (
            <EmptyState
              title="Grafo pendiente"
              description="La vista previa aparecerá cuando el archivo se convierta a grafo."
            />
          )}
        </Card>
      </div>
    </>
  )
}

