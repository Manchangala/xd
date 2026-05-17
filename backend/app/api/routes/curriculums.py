from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import ensure_student_read_access, require_roles
from app.db.session import get_db
from app.models.entities import Course, User
from app.models.enums import UserRole
from app.schemas.curriculum import CourseResponse, CurriculumGraphResponse
from app.services.curriculum_service import (
    get_active_version_or_404,
    get_courses_for_version,
    get_curriculum_graph,
)

router = APIRouter()


@router.get("/{program_id}/courses", response_model=list[CourseResponse])
def list_curriculum_courses(program_id: str, db: Session = Depends(get_db)) -> list[Course]:
    version = get_active_version_or_404(db, program_id)
    return get_courses_for_version(db, version.id)


@router.get("/{program_id}/graph", response_model=CurriculumGraphResponse)
def curriculum_graph(
    program_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> CurriculumGraphResponse:
    ensure_student_read_access(student_id, current_user)
    return get_curriculum_graph(db, program_id, student_id)
