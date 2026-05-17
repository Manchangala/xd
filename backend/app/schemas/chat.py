from datetime import datetime

from app.models.enums import ChatSender, LocalModel
from app.schemas.common import ApiModel


class ChatSessionCreate(ApiModel):
    estudiante_id: str
    titulo: str


class ChatSessionResponse(ApiModel):
    id: str
    estudiante_id: str
    titulo: str
    fecha_inicio: datetime


class ChatMessageCreate(ApiModel):
    mensaje: str
    endpoint: str | None = None
    model: str | None = None


class ChatMessageResponse(ApiModel):
    id: str
    chat_sesion_id: str
    emisor: ChatSender
    mensaje: str
    fecha: datetime
    fuentes_opcionales: list[str] | None = None


class RagQueryResponse(ApiModel):
    id: str
    chat_mensaje_id: str
    pregunta: str
    contexto_recuperado: str
    fuentes_consultadas: list[str]
    modelo_local: LocalModel


class RagRetrieveRequest(ApiModel):
    student_id: str
    pregunta: str


class RagRetrieveResponse(ApiModel):
    contexto: str
    fuentes: list[str]


class LlmGenerateRequest(ApiModel):
    student_id: str
    pregunta: str
    endpoint: str | None = None
    model: str | None = None


class LlmGenerateResponse(ApiModel):
    respuesta: str
    modelo_local: LocalModel
    generation_mode: str
    resolved_model: str | None = None


class LlmConnectionRequest(ApiModel):
    endpoint: str
    model: str


class LlmConnectionResponse(ApiModel):
    connected: bool
    reachable: bool
    provider: str | None = None
    base_url: str | None = None
    available_models: list[str]
    resolved_model: str | None = None
    issues: list[str]
    next_steps: list[str]
    message: str


class SendMessageResponse(ApiModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    rag_query: RagQueryResponse
