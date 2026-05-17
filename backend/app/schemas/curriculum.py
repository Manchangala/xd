from datetime import datetime

from app.models.enums import CourseStatus, DependencyType
from app.schemas.common import ApiModel


class ProgramCreate(ApiModel):
    codigo: str
    nombre: str
    total_creditos: int
    activo: bool = True


class ProgramUpdate(ApiModel):
    codigo: str | None = None
    nombre: str | None = None
    total_creditos: int | None = None
    activo: bool | None = None


class ProgramResponse(ApiModel):
    id: str
    codigo: str
    nombre: str
    total_creditos: int
    activo: bool


class StudentResponse(ApiModel):
    id: str
    usuario_id: str
    codigo_estudiantil: str
    semestre_actual: int
    carga_maxima_creditos: int
    creado_en: datetime


class ProgramEnrollmentResponse(ApiModel):
    id: str
    estudiante_id: str
    programa_id: str
    es_principal: bool
    fecha_inscripcion: datetime


class StudentProfileResponse(ApiModel):
    student: StudentResponse
    user: "UserResponse"
    enrollments: list[ProgramEnrollmentResponse]
    programs: list[ProgramResponse]


class StudentDirectoryItemResponse(ApiModel):
    student: StudentResponse
    user: "UserResponse"


class StudentUpdateRequest(ApiModel):
    semestre_actual: int | None = None
    carga_maxima_creditos: int | None = None


class StudentProgramsUpdateRequest(ApiModel):
    programa_principal_id: str
    programa_secundario_id: str | None = None


class CurriculumVersionResponse(ApiModel):
    id: str
    programa_id: str
    nombre_version: str
    anio_vigencia: int
    activa: bool


class CourseCreate(ApiModel):
    version_malla_id: str
    codigo: str
    nombre: str
    creditos: int
    semestre_sugerido: int
    electiva: bool = False
    area_opcional: str | None = None
    descripcion_opcional: str | None = None


class CourseUpdate(ApiModel):
    version_malla_id: str | None = None
    codigo: str | None = None
    nombre: str | None = None
    creditos: int | None = None
    semestre_sugerido: int | None = None
    electiva: bool | None = None
    area_opcional: str | None = None
    descripcion_opcional: str | None = None


class CourseResponse(ApiModel):
    id: str
    version_malla_id: str
    codigo: str
    nombre: str
    creditos: int
    semestre_sugerido: int
    electiva: bool
    area_opcional: str | None = None
    descripcion_opcional: str | None = None


class DependencyResponse(ApiModel):
    id: str
    materia_id: str
    materia_requerida_id: str
    tipo: DependencyType


class CourseWithStateResponse(CourseResponse):
    estado: CourseStatus
    prerequisitos: list[CourseResponse]
    correquisitos: list[CourseResponse]
    dependientes: list[CourseResponse]


class CurriculumGraphResponse(ApiModel):
    programa: ProgramResponse
    version: CurriculumVersionResponse
    materias: list[CourseWithStateResponse]
    dependencias: list[DependencyResponse]


class HistoryResponse(ApiModel):
    id: str
    estudiante_id: str
    materia_id: str
    estado: CourseStatus
    semestre_cursado: int | None = None
    actualizado_en: datetime


class HistoryUpdateRequest(ApiModel):
    estado: CourseStatus
    semestre_cursado: int | None = None


class ProgressSummaryResponse(ApiModel):
    total_creditos: int
    creditos_aprobados: int
    porcentaje_avance: float
    promedio_acumulado: float | None
    aprobadas: int
    en_curso: int
    bloqueadas: int
    semestre_estimado_graduacion: int
    semestres_restantes_estimados: int
    carga_maxima_creditos: int
    disponibles_proximo_semestre: list[CourseWithStateResponse]
    avance_por_semestre: list[dict[str, int | str]]
    alertas: list[str]


class DoubleProgramUnitResponse(ApiModel):
    programa: ProgramResponse
    progreso: ProgressSummaryResponse


class DoubleProgramResponse(ApiModel):
    principal: DoubleProgramUnitResponse
    secundario: DoubleProgramUnitResponse | None = None
    materias_compartidas: list[str]


from app.schemas.auth import UserResponse  # noqa: E402  # avoids circular import during class creation

StudentProfileResponse.model_rebuild()
