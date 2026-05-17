from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import RouteStep, Scenario, ScenarioEvent, ScenarioResult, SuggestedRoute
from app.models.enums import CourseStatus, Workload
from app.schemas.simulation import (
    RouteResponse,
    RouteStepResponse,
    ScenarioEventRecordResponse,
    ScenarioSnapshotResponse,
    ScenarioSummaryResponse,
)


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def scenario_snapshot(db: Session, scenario: Scenario) -> ScenarioSnapshotResponse:
    events = list(
        db.scalars(select(ScenarioEvent).where(ScenarioEvent.escenario_id == scenario.id)),
    )
    results = list(
        db.scalars(select(ScenarioResult).where(ScenarioResult.escenario_id == scenario.id)),
    )
    routes = list(
        db.scalars(
            select(SuggestedRoute)
            .where(SuggestedRoute.escenario_id == scenario.id)
            .order_by(SuggestedRoute.orden),
        ),
    )
    route_ids = [route.id for route in routes]
    steps = (
        list(db.scalars(select(RouteStep).where(RouteStep.ruta_id.in_(route_ids))))
        if route_ids
        else []
    )
    best_route = routes[0] if routes else None
    blocked = sum(1 for item in results if item.estado_simulado == CourseStatus.BLOQUEADA)
    workload = best_route.carga_trabajo if best_route else Workload.MEDIA
    return ScenarioSnapshotResponse(
        escenario=scenario,
        eventos=[ScenarioEventRecordResponse.model_validate(item) for item in events],
        resultados=results,
        rutas=[RouteResponse.model_validate(item) for item in routes],
        pasos_ruta=[RouteStepResponse.model_validate(item) for item in steps],
        resumen=ScenarioSummaryResponse(
            materias_bloqueadas=blocked,
            creditos_disponibles=max(12, 24 - blocked * 2),
            semestre_estimado_graduacion=(
                best_route.semestre_estimado_graduacion if best_route else 9
            ),
            creditos_promedio_semestre=(
                22 if workload == Workload.ALTA else 18 if workload == Workload.MEDIA else 14
            ),
            promedio_proyectado=(
                3.95 if workload == Workload.ALTA else 4.08 if workload == Workload.MEDIA else 4.18
            ),
            carga_trabajo=workload,
        ),
    )


def save_scenario(
    db: Session,
    student_id: str,
    nombre: str,
    descripcion: str,
    simulation,
) -> ScenarioSnapshotResponse:
    count = db.scalar(
        select(func.count()).select_from(Scenario).where(Scenario.estudiante_id == student_id),
    )
    if count >= 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo puedes guardar hasta veinte escenarios en esta demo",
        )

    now = datetime.now(timezone.utc)
    scenario = Scenario(
        id=uid("scenario"),
        estudiante_id=student_id,
        nombre=nombre,
        descripcion=descripcion,
        creado_en=now,
        actualizado_en=now,
    )
    db.add(scenario)
    db.flush()

    db.add(
        ScenarioEvent(
            id=uid("event"),
            escenario_id=scenario.id,
            materia_id=simulation.evento.materia_id,
            tipo_evento=simulation.evento.tipo_evento,
        ),
    )
    for history in simulation.historial_simulado:
        db.add(
            ScenarioResult(
                id=uid("result"),
                escenario_id=scenario.id,
                materia_id=history.materia_id,
                estado_simulado=history.estado,
            ),
        )

    route_map: dict[str, SuggestedRoute] = {}
    for index, route in enumerate(simulation.rutas, start=1):
        stored_route = SuggestedRoute(
            id=uid("route"),
            escenario_id=scenario.id,
            nombre=route.nombre,
            orden=index,
            semestre_estimado_graduacion=route.semestre_estimado_graduacion,
            duracion_estimada=route.duracion_estimada,
            dificultad=route.dificultad,
            carga_trabajo=route.carga_trabajo,
            descripcion=route.descripcion,
        )
        db.add(stored_route)
        route_map[route.id] = stored_route

    course_chain = [simulation.evento.materia_id, *simulation.materias_bloqueadas]
    for stored_route in route_map.values():
        for index, materia_id in enumerate(course_chain, start=1):
            db.add(
                RouteStep(
                    id=uid("step"),
                    ruta_id=stored_route.id,
                    materia_id=materia_id,
                    semestre_sugerido=(
                        stored_route.semestre_estimado_graduacion
                        - stored_route.duracion_estimada
                        + min(index, stored_route.duracion_estimada)
                    ),
                    orden=index,
                ),
            )

    db.commit()
    db.refresh(scenario)
    return scenario_snapshot(db, scenario)


def compare_scenarios(
    db: Session,
    scenario_a_id: str,
    scenario_b_id: str,
) -> tuple[ScenarioSnapshotResponse, ScenarioSnapshotResponse]:
    scenario_a = db.get(Scenario, scenario_a_id)
    scenario_b = db.get(Scenario, scenario_b_id)
    if not scenario_a or not scenario_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selecciona dos escenarios válidos",
        )
    return scenario_snapshot(db, scenario_a), scenario_snapshot(db, scenario_b)
