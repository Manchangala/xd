from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.entities import PasswordResetToken, Student, User
from app.models.enums import UserRole
from app.schemas.admin import AdminUserCreate, AdminUserItemResponse, AdminUserUpdate
from app.schemas.auth import (
    LoginResponse,
    PasswordRecoveryResponse,
    RegisterRequest,
    UserResponse,
)
from app.schemas.curriculum import StudentResponse
from app.services.curriculum_service import replace_student_programs


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def _ensure_email_available(
    db: Session,
    email: str,
    *,
    exclude_user_id: str | None = None,
) -> None:
    query = select(User).where(func.lower(User.email) == email.lower())
    if exclude_user_id:
        query = query.where(User.id != exclude_user_id)
    if db.scalar(query):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ya existe un usuario con ese email",
        )


def _ensure_student_code_available(db: Session, code: str) -> None:
    if db.scalar(select(Student).where(Student.codigo_estudiantil == code)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ya existe un estudiante con ese código",
        )


def _build_login_response(user: User, student: Student | None = None) -> LoginResponse:
    from app.core.security import create_access_token

    return LoginResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
        student_id=student.id if student else None,
    )


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def register_student(db: Session, payload: RegisterRequest) -> LoginResponse:
    _ensure_email_available(db, payload.email)
    _ensure_student_code_available(db, payload.codigo_estudiantil)

    user = User(
        id=uid("user"),
        nombre=payload.nombre,
        email=payload.email,
        password_hash=hash_password(payload.password),
        rol=UserRole.STUDENT,
        activo=True,
    )
    student = Student(
        id=uid("student"),
        usuario_id=user.id,
        codigo_estudiantil=payload.codigo_estudiantil,
        semestre_actual=payload.semestre_actual,
        carga_maxima_creditos=payload.carga_maxima_creditos,
    )
    db.add_all([user, student])
    db.flush()
    replace_student_programs(
        db,
        student.id,
        payload.programa_principal_id,
        payload.programa_secundario_id,
        commit=False,
    )
    db.commit()
    db.refresh(user)
    db.refresh(student)
    return _build_login_response(user, student)


def request_password_recovery(db: Session, email: str) -> PasswordRecoveryResponse:
    user = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe un usuario con ese email",
        )
    code = token_urlsafe(12)
    db.add(
        PasswordResetToken(
            id=uid("reset"),
            usuario_id=user.id,
            token_hash=sha256(code.encode("utf-8")).hexdigest(),
            expira_en=datetime.now(timezone.utc) + timedelta(minutes=15),
        ),
    )
    db.commit()
    return PasswordRecoveryResponse(
        message="Código de recuperación generado. En producción se enviaría por email.",
        demo_code=code,
    )


def confirm_password_recovery(
    db: Session,
    email: str,
    code: str,
    new_password: str,
) -> dict[str, bool]:
    user = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe un usuario con ese email",
        )
    token_hash = sha256(code.encode("utf-8")).hexdigest()
    reset_token = db.scalar(
        select(PasswordResetToken)
        .where(
            PasswordResetToken.usuario_id == user.id,
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.usado_en.is_(None),
        )
        .order_by(PasswordResetToken.creado_en.desc()),
    )
    if not reset_token or _as_aware_utc(reset_token.expira_en) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El código de recuperación no es válido o expiró",
        )
    user.password_hash = hash_password(new_password)
    reset_token.usado_en = datetime.now(timezone.utc)
    db.add_all([user, reset_token])
    db.commit()
    return {"ok": True}


def list_users(db: Session) -> list[AdminUserItemResponse]:
    users = list(db.scalars(select(User).order_by(User.nombre)))
    students = {student.usuario_id: student for student in db.scalars(select(Student))}
    return [
        AdminUserItemResponse(
            user=UserResponse.model_validate(user),
            student=(
                StudentResponse.model_validate(students[user.id])
                if user.id in students
                else None
            ),
        )
        for user in users
    ]


def create_user(db: Session, payload: AdminUserCreate) -> AdminUserItemResponse:
    _ensure_email_available(db, payload.email)
    user = User(
        id=uid("user"),
        nombre=payload.nombre,
        email=payload.email,
        password_hash=hash_password(payload.password),
        rol=payload.rol,
        activo=payload.activo,
    )
    db.add(user)
    student: Student | None = None
    if payload.rol == UserRole.STUDENT:
        if not all(
            [
                payload.codigo_estudiantil,
                payload.semestre_actual,
                payload.carga_maxima_creditos,
                payload.programa_principal_id,
            ],
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Los usuarios estudiante requieren código, semestre, carga y programa principal",
            )
        _ensure_student_code_available(db, payload.codigo_estudiantil)
        student = Student(
            id=uid("student"),
            usuario_id=user.id,
            codigo_estudiantil=payload.codigo_estudiantil,
            semestre_actual=payload.semestre_actual,
            carga_maxima_creditos=payload.carga_maxima_creditos,
        )
        db.add(student)
        db.flush()
        replace_student_programs(
            db,
            student.id,
            payload.programa_principal_id,
            payload.programa_secundario_id,
            commit=False,
        )
    db.commit()
    db.refresh(user)
    if student:
        db.refresh(student)
    return AdminUserItemResponse(
        user=UserResponse.model_validate(user),
        student=StudentResponse.model_validate(student) if student else None,
    )


def update_user(
    db: Session,
    user_id: str,
    payload: AdminUserUpdate,
) -> AdminUserItemResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    updates = payload.model_dump(exclude_unset=True)
    if "email" in updates and updates["email"] is not None:
        _ensure_email_available(db, updates["email"], exclude_user_id=user.id)
    for key, value in updates.items():
        setattr(user, key, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    student = db.scalar(select(Student).where(Student.usuario_id == user.id))
    return AdminUserItemResponse(
        user=UserResponse.model_validate(user),
        student=StudentResponse.model_validate(student) if student else None,
    )


def reset_user_password(db: Session, user_id: str, new_password: str) -> dict[str, bool]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    user.password_hash = hash_password(new_password)
    db.add(user)
    db.commit()
    return {"ok": True}
