from datetime import datetime

from app.models.enums import DependencyType, DocumentProcessingStatus, ExtractionMethod
from app.schemas.common import ApiModel


class CurriculumDocumentResponse(ApiModel):
    id: str
    programa_id: str
    nombre_archivo: str
    tipo_archivo: str
    estado_procesamiento: DocumentProcessingStatus
    porcentaje_progreso: int
    fecha_carga: datetime


class DocumentExtractionResponse(ApiModel):
    id: str
    documento_malla_id: str
    texto_extraido: str
    metodo_extraccion: ExtractionMethod
    confianza_ocr: float
    fecha_procesamiento: datetime


class DetectedCourseResponse(ApiModel):
    codigo: str
    nombre: str
    creditos: int
    semestre: int
    confianza: float


class DetectedDependencyResponse(ApiModel):
    materia: str
    requiere: str
    tipo: DependencyType
    confianza: float


class PdfProcessingDiagnostics(ApiModel):
    page_count: int
    pages_with_native_text: int
    pages_using_ocr: int
    pages_without_text: int
    scanned_like: bool
    ocr_available: bool
    ocr_language_used: str | None = None
    can_retry_with_ocr: bool
    recommended_action: str
    message: str


class PdfProcessResponse(ApiModel):
    document: CurriculumDocumentResponse
    extraction: DocumentExtractionResponse
    courses: list[DetectedCourseResponse]
    dependencies: list[DetectedDependencyResponse]
    diagnostics: PdfProcessingDiagnostics


class OcrStatusResponse(ApiModel):
    available: bool
    engine: str | None = None
    installed_path: str | None = None
    languages: list[str]
    spanish_language_available: bool
    ready_for_scanned_pdfs: bool
    issues: list[str]
    next_steps: list[str]
    message: str


class ApproveGraphRequest(ApiModel):
    version_id: str
    courses: list[DetectedCourseResponse]
    dependencies: list[DetectedDependencyResponse]


class ApproveGraphResponse(ApiModel):
    document_id: str
    approved: bool
    created_courses: int
    updated_courses: int
    created_dependencies: int
    message: str
