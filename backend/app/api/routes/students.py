from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    ensure_student_read_access,
    ensure_student_write_access,
    require_roles,
)
from app.db.session import get_db
from app.models.entities import AcademicHistory, User
from app.models.enums import UserRole
from app.schemas.curriculum import (
    DoubleProgramResponse,
    HistoryResponse,
    HistoryUpdateRequest,
    ProgressSummaryResponse,
    StudentDirectoryItemResponse,
    StudentProgramsUpdateRequest,
    StudentProfileResponse,
    StudentResponse,
    StudentUpdateRequest,
)
from app.services.curriculum_service import (
    get_double_program_overview,
    get_progress_summary,
    get_student_profile,
    list_student_directory,
    replace_student_programs,
    update_student_profile,
    update_history_status,
)

router = APIRouter()


@router.get("", response_model=list[StudentDirectoryItemResponse])
def directory(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.ADVISOR)),
) -> list[StudentDirectoryItemResponse]:
    return list_student_directory(db)


@router.get("/{student_id}/profile", response_model=StudentProfileResponse)
def profile(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> StudentProfileResponse:
    ensure_student_read_access(student_id, current_user)
    return get_student_profile(db, student_id)


@router.patch("/{student_id}", response_model=StudentResponse)
def patch_student(
    student_id: str,
    payload: StudentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> StudentResponse:
    ensure_student_write_access(student_id, current_user)
    return update_student_profile(
        db,
        student_id,
        payload.semestre_actual,
        payload.carga_maxima_creditos,
    )


@router.patch("/{student_id}/programs", response_model=StudentProfileResponse)
def patch_programs(
    student_id: str,
    payload: StudentProgramsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> StudentProfileResponse:
    ensure_student_write_access(student_id, current_user)
    return replace_student_programs(
        db,
        student_id,
        payload.programa_principal_id,
        payload.programa_secundario_id,
    )


@router.get("/{student_id}/history", response_model=list[HistoryResponse])
def list_history(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> list[AcademicHistory]:
    ensure_student_read_access(student_id, current_user)
    return list(
        db.scalars(
            select(AcademicHistory).where(AcademicHistory.estudiante_id == student_id),
        ),
    )


@router.patch("/{student_id}/history/{course_id}", response_model=HistoryResponse)
def patch_history(
    student_id: str,
    course_id: str,
    payload: HistoryUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> AcademicHistory:
    ensure_student_write_access(student_id, current_user)
    return update_history_status(
        db,
        student_id,
        course_id,
        payload.estado,
        payload.semestre_cursado,
    )


@router.get("/{student_id}/progress/{program_id}", response_model=ProgressSummaryResponse)
def progress(
    student_id: str,
    program_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> ProgressSummaryResponse:
    ensure_student_read_access(student_id, current_user)
    return get_progress_summary(db, student_id, program_id)


@router.get("/{student_id}/double-program", response_model=DoubleProgramResponse)
def double_program(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> DoubleProgramResponse:
    ensure_student_read_access(student_id, current_user)
    return get_double_program_overview(db, student_id)
