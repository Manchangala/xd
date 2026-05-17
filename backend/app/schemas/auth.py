from datetime import datetime

from pydantic import EmailStr, Field

from app.models.enums import UserRole
from app.schemas.common import ApiModel


class LoginRequest(ApiModel):
    email: EmailStr
    password: str


class UserResponse(ApiModel):
    id: str
    nombre: str
    email: EmailStr
    rol: UserRole
    activo: bool
    creado_en: datetime


class LoginResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    student_id: str | None = None


class RegisterRequest(ApiModel):
    nombre: str
    email: EmailStr
    password: str = Field(min_length=6)
    codigo_estudiantil: str
    semestre_actual: int = Field(ge=1, le=12)
    carga_maxima_creditos: int = Field(ge=8, le=30)
    programa_principal_id: str
    programa_secundario_id: str | None = None


class PasswordRecoveryRequest(ApiModel):
    email: EmailStr


class PasswordRecoveryResponse(ApiModel):
    message: str
    demo_code: str


class PasswordRecoveryConfirmRequest(ApiModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6)
