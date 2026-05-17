from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.entities import Course, User
from app.models.enums import UserRole
from app.schemas.curriculum import CourseCreate, CourseResponse, CourseUpdate
from app.services.admin_service import create_course as create_course_service
from app.services.admin_service import update_course as update_course_service

router = APIRouter()


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db)) -> Course:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    return course


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> Course:
    return create_course_service(db, payload)


@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: str,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> Course:
    return update_course_service(db, course_id, payload)
