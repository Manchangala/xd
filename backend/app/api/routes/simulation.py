from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import ensure_student_write_access, require_roles
from app.db.session import get_db
from app.models.entities import User
from app.models.enums import ScenarioEventType, UserRole
from app.schemas.simulation import SimulationRequest, SimulationResponse
from app.services.simulation_service import simulate_event

router = APIRouter()


@router.post("/failure", response_model=SimulationResponse)
def simulate_failure(
    payload: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> SimulationResponse:
    ensure_student_write_access(payload.student_id, current_user)
    return simulate_event(db, payload.student_id, payload.course_id, ScenarioEventType.PERDIDA)


@router.post("/cancellation", response_model=SimulationResponse)
def simulate_cancellation(
    payload: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> SimulationResponse:
    ensure_student_write_access(payload.student_id, current_user)
    return simulate_event(db, payload.student_id, payload.course_id, ScenarioEventType.CANCELACION)


@router.post("/postponement", response_model=SimulationResponse)
def simulate_postponement(
    payload: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> SimulationResponse:
    ensure_student_write_access(payload.student_id, current_user)
    return simulate_event(db, payload.student_id, payload.course_id, ScenarioEventType.APLAZAMIENTO)
