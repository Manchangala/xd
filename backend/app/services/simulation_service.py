from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import AcademicHistory, Course
from app.models.enums import CourseStatus, Difficulty, ScenarioEventType, Workload
from app.schemas.curriculum import HistoryResponse
from app.schemas.simulation import RouteResponse, SimulationEventResponse, SimulationResponse
from app.services.curriculum_service import (
    build_courses_with_state,
    get_courses_for_version,
    get_dependencies_for_courses,
    get_histories_for_courses,
    obtener_dependientes,
)


def calcular_bloqueos_en_cascada(materia_id: str, dependencies) -> list[str]:
    visited: set[str] = set()
    queue = list(obtener_dependientes(materia_id, dependencies))
    while queue:
        next_id = queue.pop(0)
        if next_id in visited:
            continue
        visited.add(next_id)
        queue.extend(obtener_dependientes(next_id, dependencies))
    return list(visited)


def recalcular_estados(
    histories: list[AcademicHistory],
    materia_id: str,
    event_type: ScenarioEventType,
    dependencies,
) -> list[HistoryResponse]:
    affected = set(calcular_bloqueos_en_cascada(materia_id, dependencies))
    now = datetime.now(timezone.utc)
    result: list[HistoryResponse] = []
    for history in histories:
        next_status = history.estado
        if history.materia_id == materia_id:
            next_status = (
                CourseStatus.REPROBADA
                if event_type == ScenarioEventType.PERDIDA
                else CourseStatus.PENDIENTE
            )
        elif history.materia_id in affected:
            next_status = CourseStatus.BLOQUEADA
        result.append(
            HistoryResponse(
                id=history.id,
                estudiante_id=history.estudiante_id,
                materia_id=history.materia_id,
                estado=next_status,
                semestre_cursado=history.semestre_cursado,
                actualizado_en=now,
            ),
        )
    return result


def generar_rutas_alternativas(base_semester: int) -> list[RouteResponse]:
    return [
        RouteResponse(
            id="preview_accelerated",
            escenario_id="preview",
            nombre="Ruta acelerada",
            orden=1,
            semestre_estimado_graduacion=base_semester + 1,
            duracion_estimada=3,
            dificultad=Difficulty.ALTA,
            carga_trabajo=Workload.ALTA,
            descripcion="Recupera la materia crítica cuanto antes y concentra más créditos para minimizar el retraso.",
        ),
        RouteResponse(
            id="preview_balanced",
            escenario_id="preview",
            nombre="Ruta balanceada",
            orden=2,
            semestre_estimado_graduacion=base_semester + 2,
            duracion_estimada=4,
            dificultad=Difficulty.MEDIA,
            carga_trabajo=Workload.MEDIA,
            descripcion="Distribuye el esfuerzo entre semestres y conserva un ritmo sostenible de avance.",
        ),
        RouteResponse(
            id="preview_paced",
            escenario_id="preview",
            nombre="Ruta pausada",
            orden=3,
            semestre_estimado_graduacion=base_semester + 3,
            duracion_estimada=5,
            dificultad=Difficulty.BAJA,
            carga_trabajo=Workload.BAJA,
            descripcion="Reduce carga por semestre y prioriza estabilidad académica a cambio de más duración.",
        ),
    ]


def simulate_event(
    db: Session,
    student_id: str,
    course_id: str,
    event_type: ScenarioEventType,
) -> SimulationResponse:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")

    courses = get_courses_for_version(db, course.version_malla_id)
    course_ids = {item.id for item in courses}
    dependencies = get_dependencies_for_courses(db, course_ids)
    histories = get_histories_for_courses(db, student_id, course_ids)
    if not histories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe historial para ese estudiante y malla",
        )

    affected = calcular_bloqueos_en_cascada(course_id, dependencies)
    direct_affected = obtener_dependientes(course_id, dependencies)
    indirect_affected = [item for item in affected if item not in direct_affected]
    simulated_histories = recalcular_estados(histories, course_id, event_type, dependencies)

    before_available = sum(
        item.creditos
        for item in build_courses_with_state(courses, dependencies, histories)
        if item.estado == CourseStatus.DISPONIBLE
    )
    after_available = sum(
        item.creditos
        for item in build_courses_with_state(courses, dependencies, simulated_histories)
        if item.estado == CourseStatus.DISPONIBLE
    )
    impact_credits = sum(course.creditos for course in courses if course.id in affected)
    before_semester = 9
    after_semester = (
        before_semester + max(1, (len(affected) + 2) // 3)
        if event_type == ScenarioEventType.PERDIDA
        else before_semester + 1
    )
    explanation = (
        f"{course.nombre} bloquea {len(direct_affected)} materia(s) de forma directa y "
        f"{len(indirect_affected)} de forma indirecta dentro de la cadena curricular."
    )

    return SimulationResponse(
        evento=SimulationEventResponse(materia_id=course_id, tipo_evento=event_type),
        historial_original=[HistoryResponse.model_validate(item) for item in histories],
        historial_simulado=simulated_histories,
        materias_bloqueadas=affected,
        materias_bloqueadas_directas=direct_affected,
        materias_bloqueadas_indirectas=indirect_affected,
        impacto_creditos=impact_credits,
        creditos_disponibles_antes=before_available,
        creditos_disponibles_despues=after_available,
        semestre_estimado_antes=before_semester,
        semestre_estimado_despues=after_semester,
        explicacion=explanation,
        rutas=generar_rutas_alternativas(after_semester - 1),
    )
