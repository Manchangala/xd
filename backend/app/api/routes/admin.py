from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.entities import CourseDependency, CurriculumVersion, User
from app.models.enums import DependencyType, UserRole
from app.schemas.admin import (
    AdminPasswordResetRequest,
    AdminDashboardResponse,
    AdminOverviewResponse,
    AdminUserCreate,
    AdminUserItemResponse,
    AdminUserUpdate,
    DependencyCreate,
    SystemStatusResponse,
    VersionCreate,
    VersionResponse,
    VersionUpdate,
)
from app.schemas.curriculum import DependencyResponse
from app.services.admin_service import (
    create_dependency,
    create_version,
    delete_dependency,
    get_dashboard_data,
    get_overview,
    get_system_status,
    toggle_version,
    update_version,
)
from app.services.user_service import create_user, list_users, reset_user_password, update_user

router = APIRouter()


@router.get("/overview", response_model=AdminOverviewResponse)
def overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminOverviewResponse:
    return get_overview(db)


@router.get("/dashboard", response_model=AdminDashboardResponse)
def dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminDashboardResponse:
    return get_dashboard_data(db)


@router.get("/system-status", response_model=SystemStatusResponse)
def system_status(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> SystemStatusResponse:
    return get_system_status(db)


@router.post("/versions", response_model=VersionResponse, status_code=status.HTTP_201_CREATED)
def post_version(
    payload: VersionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> CurriculumVersion:
    return create_version(db, payload)


@router.patch("/versions/{version_id}", response_model=VersionResponse)
def patch_version(
    version_id: str,
    payload: VersionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> CurriculumVersion:
    return update_version(db, version_id, payload)


@router.post("/versions/{version_id}/toggle", response_model=VersionResponse)
def post_toggle_version(
    version_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> CurriculumVersion:
    return toggle_version(db, version_id)


@router.post(
    "/dependencies",
    response_model=DependencyResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_dependency(
    payload: DependencyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> CourseDependency:
    return create_dependency(
        db,
        payload.materia_id,
        payload.materia_requerida_id,
        DependencyType(payload.tipo),
    )


@router.delete("/dependencies/{dependency_id}")
def remove_dependency(
    dependency_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict[str, str | bool]:
    return delete_dependency(db, dependency_id)


@router.get("/users", response_model=list[AdminUserItemResponse])
def users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[AdminUserItemResponse]:
    return list_users(db)


@router.post("/users", response_model=AdminUserItemResponse, status_code=status.HTTP_201_CREATED)
def post_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminUserItemResponse:
    return create_user(db, payload)


@router.patch("/users/{user_id}", response_model=AdminUserItemResponse)
def patch_user(
    user_id: str,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminUserItemResponse:
    return update_user(db, user_id, payload)


@router.post("/users/{user_id}/reset-password")
def post_reset_user_password(
    user_id: str,
    payload: AdminPasswordResetRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict[str, bool]:
    return reset_user_password(db, user_id, payload.new_password)
