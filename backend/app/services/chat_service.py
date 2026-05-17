import json
import unicodedata
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import ChatMessage, ChatSession, RagQuery
from app.models.enums import ChatSender, CourseStatus, LocalModel, ScenarioEventType
from app.schemas.chat import (
    ChatMessageResponse,
    ChatSessionResponse,
    RagQueryResponse,
    RagRetrieveResponse,
    SendMessageResponse,
)
from app.services.curriculum_service import (
    get_curriculum_graph,
    get_primary_program_id,
    get_progress_summary,
)
from app.services.local_llm_service import LocalGenerationResult, generate_with_local_llm
from app.services.rag_service import build_rag_context
from app.services.simulation_service import simulate_event


def _parse_json_list(value: str | None) -> list[str] | None:
    return json.loads(value) if value else None


def _normalize_for_match(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value.lower())
        if not unicodedata.combining(character)
    )


def _find_course_from_question(graph, question: str):
    normalized_question = _normalize_for_match(question)
    aliases = (
        ("calculo ii", "mat102"),
        ("calculo i", "mat101"),
    )
    for alias, code in aliases:
        if alias in normalized_question:
            return next(
                (course for course in graph.materias if course.codigo.lower() == code),
                None,
            )
    ordered_courses = sorted(
        graph.materias,
        key=lambda course: len(course.nombre),
        reverse=True,
    )
    return next(
        (
            course
            for course in ordered_courses
            if _normalize_for_match(course.codigo) in normalized_question
            or _normalize_for_match(course.nombre) in normalized_question
        ),
        None,
    )


def serialize_message(message: ChatMessage) -> ChatMessageResponse:
    return ChatMessageResponse(
        id=message.id,
        chat_sesion_id=message.chat_sesion_id,
        emisor=message.emisor,
        mensaje=message.mensaje,
        fecha=message.fecha,
        fuentes_opcionales=_parse_json_list(message.fuentes_opcionales),
    )


def serialize_rag_query(query: RagQuery) -> RagQueryResponse:
    return RagQueryResponse(
        id=query.id,
        chat_mensaje_id=query.chat_mensaje_id,
        pregunta=query.pregunta,
        contexto_recuperado=query.contexto_recuperado,
        fuentes_consultadas=json.loads(query.fuentes_consultadas),
        modelo_local=query.modelo_local,
    )


def list_sessions(db: Session, student_id: str) -> list[ChatSessionResponse]:
    sessions = list(
        db.scalars(
            select(ChatSession)
            .where(ChatSession.estudiante_id == student_id)
            .order_by(ChatSession.fecha_inicio.desc()),
        ),
    )
    return [ChatSessionResponse.model_validate(item) for item in sessions]


def create_session(db: Session, student_id: str, title: str) -> ChatSessionResponse:
    session = ChatSession(
        id=f"chat_{uuid4().hex[:10]}",
        estudiante_id=student_id,
        titulo=title,
        fecha_inicio=datetime.now(timezone.utc),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionResponse.model_validate(session)


def get_messages(db: Session, session_id: str) -> list[ChatMessageResponse]:
    messages = list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.chat_sesion_id == session_id)
            .order_by(ChatMessage.fecha),
        ),
    )
    return [serialize_message(item) for item in messages]


def get_rag_queries(db: Session, session_id: str) -> list[RagQueryResponse]:
    message_ids = list(
        db.scalars(
            select(ChatMessage.id).where(ChatMessage.chat_sesion_id == session_id),
        ),
    )
    if not message_ids:
        return []
    queries = list(
        db.scalars(
            select(RagQuery)
            .join(ChatMessage, ChatMessage.id == RagQuery.chat_mensaje_id)
            .where(RagQuery.chat_mensaje_id.in_(message_ids))
            .order_by(ChatMessage.fecha, RagQuery.id),
        ),
    )
    return [serialize_rag_query(item) for item in queries]


def retrieve_context(db: Session, student_id: str, question: str) -> RagRetrieveResponse:
    program_id = get_primary_program_id(db, student_id)
    context, sources = build_rag_context(db, student_id, question, program_id=program_id)
    return RagRetrieveResponse(contexto=context, fuentes=sources)


def generate_answer(db: Session, student_id: str, question: str) -> str:
    program_id = get_primary_program_id(db, student_id)
    graph = get_curriculum_graph(db, program_id, student_id)
    summary = get_progress_summary(db, student_id, program_id)
    normalized = _normalize_for_match(question)
    course = _find_course_from_question(graph, question)
    course_by_id = {item.id: item for item in graph.materias}

    if "proximo semestre" in normalized:
        available_next_semester = summary.disponibles_proximo_semestre
        names = ", ".join(item.nombre for item in available_next_semester[:4])
        total_credits = sum(item.creditos for item in available_next_semester)
        return (
            f"Con base en tu historial académico, puedes cursar {names}. "
            f"En conjunto representan {total_credits} créditos disponibles. "
            "La recomendación sale del grafo curricular y de tus prerrequisitos aprobados."
        )
    if "creditos" in normalized:
        return (
            f"Te faltan {summary.total_creditos - summary.creditos_aprobados} créditos "
            "para completar el programa principal."
        )
    if course and any(token in normalized for token in ("pierdo", "perder", "perdida")):
        simulation = simulate_event(db, student_id, course.id, ScenarioEventType.PERDIDA)
        direct_courses = [
            course_by_id[item].nombre
            for item in simulation.materias_bloqueadas_directas
            if item in course_by_id
        ]
        indirect_courses = [
            course_by_id[item].nombre
            for item in simulation.materias_bloqueadas_indirectas
            if item in course_by_id
        ]
        highlighted = ", ".join([*direct_courses, *indirect_courses][:4]) or (
            "ninguna materia adicional"
        )
        blocked_count = len(simulation.materias_bloqueadas)
        direct_count = len(simulation.materias_bloqueadas_directas)
        indirect_count = len(simulation.materias_bloqueadas_indirectas)
        blocked_label = "materia" if blocked_count == 1 else "materias"
        direct_label = "directa" if direct_count == 1 else "directas"
        indirect_label = "indirecta" if indirect_count == 1 else "indirectas"
        return (
            f"Si pierdes {course.nombre}, se bloquean {blocked_count} "
            f"{blocked_label} en cascada ({direct_count} {direct_label} y "
            f"{indirect_count} {indirect_label}): {highlighted}. "
            f"El semestre estimado de graduación pasaría de "
            f"{simulation.semestre_estimado_antes} a {simulation.semestre_estimado_despues}."
        )
    if course and any(
        token in normalized
        for token in ("puedo tomar", "puedo cursar", "puedo ver", "puedo matricular")
    ):
        if course.estado == CourseStatus.APROBADA:
            return f"{course.nombre} ya aparece como aprobada en tu historial."
        if course.estado == CourseStatus.EN_CURSO:
            return f"{course.nombre} ya aparece en curso este semestre."
        if course.estado == CourseStatus.DISPONIBLE:
            return (
                f"Sí. {course.nombre} aparece disponible para cursar porque ya cumples "
                "sus prerrequisitos registrados."
            )
        missing_prerequisites = [
            course_by_id[prerequisite.id]
            for prerequisite in course.prerequisitos
            if prerequisite.id in course_by_id
            and course_by_id[prerequisite.id].estado != CourseStatus.APROBADA
        ]
        if missing_prerequisites:
            names = ", ".join(item.nombre for item in missing_prerequisites)
            return (
                f"Aún no. {course.nombre} requiere aprobar primero {names}. "
                "La respuesta se basa en tu historial actual y la malla activa."
            )
        return (
            f"{course.nombre} todavía no aparece disponible según tu estado académico actual."
        )
    return (
        "Con la información académica disponible, la ruta balanceada parece la más conveniente "
        "porque mantiene avance sin concentrar demasiados créditos."
    )


def generate_answer_with_optional_llm(
    db: Session,
    student_id: str,
    question: str,
    context: str,
    endpoint: str | None,
    model: str | None,
) -> tuple[str, str, str | None]:
    if endpoint and model:
        local_result: LocalGenerationResult | None = generate_with_local_llm(
            endpoint,
            model,
            question,
            context,
        )
        if local_result:
            return local_result.answer, "local_llm", local_result.resolved_model
    return generate_answer(db, student_id, question), "mock_fallback", None


def send_message(
    db: Session,
    session_id: str,
    message: str,
    endpoint: str | None = None,
    model: str | None = None,
) -> SendMessageResponse:
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
    context = retrieve_context(db, session.estudiante_id, message)
    answer, _, _ = generate_answer_with_optional_llm(
        db,
        session.estudiante_id,
        message,
        context.contexto,
        endpoint,
        model,
    )
    now = datetime.now(timezone.utc)
    user_message = ChatMessage(
        id=f"msg_{uuid4().hex[:10]}",
        chat_sesion_id=session_id,
        emisor=ChatSender.USUARIO,
        mensaje=message,
        fecha=now,
    )
    assistant_message = ChatMessage(
        id=f"msg_{uuid4().hex[:10]}",
        chat_sesion_id=session_id,
        emisor=ChatSender.ASISTENTE,
        mensaje=answer,
        fecha=now,
        fuentes_opcionales=json.dumps(context.fuentes, ensure_ascii=False),
    )
    rag_query = RagQuery(
        id=f"rag_{uuid4().hex[:10]}",
        chat_mensaje_id=assistant_message.id,
        pregunta=message,
        contexto_recuperado=context.contexto,
        fuentes_consultadas=json.dumps(context.fuentes, ensure_ascii=False),
        modelo_local=(
            LocalModel(model)
            if model in {item.value for item in LocalModel}
            else LocalModel.OTRO
        ),
    )
    db.add_all([user_message, assistant_message, rag_query])
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    db.refresh(rag_query)
    return SendMessageResponse(
        user_message=serialize_message(user_message),
        assistant_message=serialize_message(assistant_message),
        rag_query=serialize_rag_query(rag_query),
    )
