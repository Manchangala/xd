from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.entities import Student, User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    PasswordRecoveryConfirmRequest,
    PasswordRecoveryRequest,
    PasswordRecoveryResponse,
    RegisterRequest,
    UserResponse,
)
from app.services.user_service import (
    confirm_password_recovery,
    register_student,
    request_password_recovery,
)

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.activo or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    student = db.scalar(select(Student).where(Student.usuario_id == user.id))
    return LoginResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
        student_id=student.id if student else None,
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> LoginResponse:
    return register_student(db, payload)


@router.post("/recovery/request", response_model=PasswordRecoveryResponse)
def recovery_request(
    payload: PasswordRecoveryRequest,
    db: Session = Depends(get_db),
) -> PasswordRecoveryResponse:
    return request_password_recovery(db, payload.email)


@router.post("/recovery/confirm")
def recovery_confirm(
    payload: PasswordRecoveryConfirmRequest,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    return confirm_password_recovery(db, payload.email, payload.code, payload.new_password)


@router.post("/logout")
def logout(_: User = Depends(get_current_user)) -> dict[str, bool]:
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
