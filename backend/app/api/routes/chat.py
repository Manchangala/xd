from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import ensure_student_read_access, ensure_student_write_access, require_roles
from app.db.session import get_db
from app.models.entities import ChatSession, User
from app.models.enums import UserRole
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    LlmConnectionRequest,
    LlmConnectionResponse,
    LlmGenerateRequest,
    LlmGenerateResponse,
    RagQueryResponse,
    RagRetrieveRequest,
    RagRetrieveResponse,
    SendMessageResponse,
)
from app.services.chat_service import (
    create_session,
    generate_answer,
    generate_answer_with_optional_llm,
    get_messages,
    get_rag_queries,
    list_sessions,
    retrieve_context,
    send_message,
)
from app.services.local_llm_service import check_local_llm_connection

router = APIRouter()
rag_router = APIRouter()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def post_session(
    payload: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> ChatSessionResponse:
    ensure_student_write_access(payload.estudiante_id, current_user)
    return create_session(db, payload.estudiante_id, payload.titulo)


@router.get("/sessions", response_model=list[ChatSessionResponse])
def get_sessions(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> list[ChatSessionResponse]:
    ensure_student_read_access(student_id, current_user)
    return list_sessions(db, student_id)


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
def list_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> list[ChatMessageResponse]:
    session = db.get(ChatSession, session_id)
    if session:
        ensure_student_read_access(session.estudiante_id, current_user)
    return get_messages(db, session_id)


@router.get("/sessions/{session_id}/rag-queries", response_model=list[RagQueryResponse])
def list_rag_queries(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> list[RagQueryResponse]:
    session = db.get(ChatSession, session_id)
    if session:
        ensure_student_read_access(session.estudiante_id, current_user)
    return get_rag_queries(db, session_id)


@router.post("/sessions/{session_id}/messages", response_model=SendMessageResponse)
def post_message(
    session_id: str,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> SendMessageResponse:
    session = db.get(ChatSession, session_id)
    if session:
        ensure_student_write_access(session.estudiante_id, current_user)
    return send_message(db, session_id, payload.mensaje, payload.endpoint, payload.model)


@rag_router.post("/rag/retrieve", response_model=RagRetrieveResponse)
def post_retrieve(
    payload: RagRetrieveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> RagRetrieveResponse:
    ensure_student_read_access(payload.student_id, current_user)
    return retrieve_context(db, payload.student_id, payload.pregunta)


@rag_router.post("/llm/generate", response_model=LlmGenerateResponse)
def post_generate(
    payload: LlmGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT, UserRole.ADMIN)),
) -> LlmGenerateResponse:
    ensure_student_read_access(payload.student_id, current_user)
    context = retrieve_context(db, payload.student_id, payload.pregunta)
    answer, generation_mode, resolved_model = generate_answer_with_optional_llm(
        db,
        payload.student_id,
        payload.pregunta,
        context.contexto,
        payload.endpoint,
        payload.model,
    )
    return LlmGenerateResponse(
        respuesta=answer,
        modelo_local=payload.model if payload.model in {"gemma", "llama", "mistral"} else "otro",
        generation_mode=generation_mode,
        resolved_model=resolved_model,
    )


@rag_router.post("/llm/connect", response_model=LlmConnectionResponse)
def post_llm_connect(payload: LlmConnectionRequest) -> LlmConnectionResponse:
    return check_local_llm_connection(payload.endpoint, payload.model)
