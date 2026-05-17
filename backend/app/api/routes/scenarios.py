from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_student_read_access, ensure_student_write_access, require_roles
from app.db.session import get_db
from app.models.entities import Scenario, User
from app.models.enums import UserRole
from app.schemas.simulation import (
    ScenarioCompareRequest,
    ScenarioCompareResponse,
    ScenarioCreateRequest,
    ScenarioSnapshotResponse,
)
from app.services.scenario_service import compare_scenarios, save_scenario, scenario_snapshot

router = APIRouter()


@router.get("/students/{student_id}/scenarios", response_model=list[ScenarioSnapshotResponse])
def list_student_scenarios(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> list[ScenarioSnapshotResponse]:
    ensure_student_read_access(student_id, current_user)
    scenarios = list(
        db.scalars(
            select(Scenario)
            .where(Scenario.estudiante_id == student_id)
            .order_by(Scenario.actualizado_en.desc()),
        ),
    )
    return [scenario_snapshot(db, scenario) for scenario in scenarios]


@router.post("/scenarios", response_model=ScenarioSnapshotResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(
    payload: ScenarioCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> ScenarioSnapshotResponse:
    ensure_student_write_access(payload.student_id, current_user)
    return save_scenario(
        db,
        payload.student_id,
        payload.nombre,
        payload.descripcion,
        payload.simulacion,
    )


@router.get("/scenarios/{scenario_id}", response_model=ScenarioSnapshotResponse)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> ScenarioSnapshotResponse:
    scenario = db.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escenario no encontrado")
    ensure_student_read_access(scenario.estudiante_id, current_user)
    return scenario_snapshot(db, scenario)


@router.post("/scenarios/compare", response_model=ScenarioCompareResponse)
def compare(
    payload: ScenarioCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.ADVISOR)),
) -> ScenarioCompareResponse:
    scenario_a, scenario_b = compare_scenarios(db, payload.scenario_a_id, payload.scenario_b_id)
    ensure_student_read_access(scenario_a.escenario.estudiante_id, current_user)
    ensure_student_read_access(scenario_b.escenario.estudiante_id, current_user)
    return ScenarioCompareResponse(a=scenario_a, b=scenario_b)
