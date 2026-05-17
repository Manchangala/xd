from datetime import datetime

from app.schemas.common import ApiModel
from app.models.enums import UserRole
from app.schemas.auth import UserResponse
from app.schemas.curriculum import CourseResponse, DependencyResponse, ProgramResponse, StudentResponse


class AdminOverviewResponse(ApiModel):
    estudiantes_activos: int
    programas: int
    total_materias: int
    completitud_promedio: int


class AdminActivityResponse(ApiModel):
    id: str
    descripcion: str
    fecha: datetime
    tipo: str


class VersionCreate(ApiModel):
    programa_id: str
    nombre_version: str
    anio_vigencia: int
    activa: bool = True


class VersionUpdate(ApiModel):
    programa_id: str | None = None
    nombre_version: str | None = None
    anio_vigencia: int | None = None
    activa: bool | None = None


class VersionResponse(ApiModel):
    id: str
    programa_id: str
    nombre_version: str
    anio_vigencia: int
    activa: bool


class DependencyCreate(ApiModel):
    materia_id: str
    materia_requerida_id: str
    tipo: str


class AdminDashboardResponse(ApiModel):
    programas: list[ProgramResponse]
    materias: list[CourseResponse]
    versiones: list[VersionResponse]
    dependencias: list[DependencyResponse]
    activities: list[AdminActivityResponse]


class AdminUserItemResponse(ApiModel):
    user: UserResponse
    student: StudentResponse | None = None


class AdminUserCreate(ApiModel):
    nombre: str
    email: str
    password: str
    rol: UserRole
    activo: bool = True
    codigo_estudiantil: str | None = None
    semestre_actual: int | None = None
    carga_maxima_creditos: int | None = None
    programa_principal_id: str | None = None
    programa_secundario_id: str | None = None


class AdminUserUpdate(ApiModel):
    nombre: str | None = None
    email: str | None = None
    rol: UserRole | None = None
    activo: bool | None = None


class AdminPasswordResetRequest(ApiModel):
    new_password: str


class SystemCheckResponse(ApiModel):
    id: str
    nombre: str
    estado: str
    detalle: str
    accion_recomendada: str | None = None


class SystemStatusResponse(ApiModel):
    environment: str
    app_name: str
    checks: list[SystemCheckResponse]
