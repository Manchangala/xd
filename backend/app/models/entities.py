from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import (
    ChatSender,
    CourseStatus,
    DependencyType,
    Difficulty,
    DocumentProcessingStatus,
    ExtractionMethod,
    LocalModel,
    ScenarioEventType,
    UserRole,
    Workload,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    estudiante: Mapped["Student | None"] = relationship(back_populates="usuario", uselist=False)
    tokens_recuperacion: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="usuario",
    )


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    codigo_estudiantil: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    semestre_actual: Mapped[int] = mapped_column(Integer, nullable=False)
    carga_maxima_creditos: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    usuario: Mapped[User] = relationship(back_populates="estudiante")
    inscripciones: Mapped[list["ProgramEnrollment"]] = relationship(back_populates="estudiante")
    historial: Mapped[list["AcademicHistory"]] = relationship(back_populates="estudiante")
    escenarios: Mapped[list["Scenario"]] = relationship(back_populates="estudiante")
    sesiones_chat: Mapped[list["ChatSession"]] = relationship(back_populates="estudiante")


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    total_creditos: Mapped[int] = mapped_column(Integer, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    inscripciones: Mapped[list["ProgramEnrollment"]] = relationship(back_populates="programa")
    versiones: Mapped[list["CurriculumVersion"]] = relationship(back_populates="programa")
    documentos: Mapped[list["CurriculumDocument"]] = relationship(back_populates="programa")


class ProgramEnrollment(Base):
    __tablename__ = "program_enrollments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    estudiante_id: Mapped[str] = mapped_column(ForeignKey("students.id"), nullable=False)
    programa_id: Mapped[str] = mapped_column(ForeignKey("programs.id"), nullable=False)
    es_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_inscripcion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    estudiante: Mapped[Student] = relationship(back_populates="inscripciones")
    programa: Mapped[Program] = relationship(back_populates="inscripciones")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    usuario: Mapped[User] = relationship(back_populates="tokens_recuperacion")


class CurriculumVersion(Base):
    __tablename__ = "curriculum_versions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    programa_id: Mapped[str] = mapped_column(ForeignKey("programs.id"), nullable=False)
    nombre_version: Mapped[str] = mapped_column(String(50), nullable=False)
    anio_vigencia: Mapped[int] = mapped_column(Integer, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    programa: Mapped[Program] = relationship(back_populates="versiones")
    materias: Mapped[list["Course"]] = relationship(back_populates="version")


class AdminActivity(Base):
    __tablename__ = "admin_activities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("version_malla_id", "codigo", name="uq_course_version_code"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    version_malla_id: Mapped[str] = mapped_column(ForeignKey("curriculum_versions.id"), nullable=False)
    codigo: Mapped[str] = mapped_column(String(20), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    creditos: Mapped[int] = mapped_column(Integer, nullable=False)
    semestre_sugerido: Mapped[int] = mapped_column(Integer, nullable=False)
    electiva: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    area_opcional: Mapped[str | None] = mapped_column(String(100))
    descripcion_opcional: Mapped[str | None] = mapped_column(Text)

    version: Mapped[CurriculumVersion] = relationship(back_populates="materias")
    historial: Mapped[list["AcademicHistory"]] = relationship(back_populates="materia")


class CourseDependency(Base):
    __tablename__ = "course_dependencies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    materia_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    materia_requerida_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    tipo: Mapped[DependencyType] = mapped_column(Enum(DependencyType), nullable=False)


class AcademicHistory(Base):
    __tablename__ = "academic_history"
    __table_args__ = (
        UniqueConstraint("estudiante_id", "materia_id", name="uq_history_student_course"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    estudiante_id: Mapped[str] = mapped_column(ForeignKey("students.id"), nullable=False)
    materia_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    estado: Mapped[CourseStatus] = mapped_column(Enum(CourseStatus), nullable=False)
    semestre_cursado: Mapped[int | None] = mapped_column(Integer)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    estudiante: Mapped[Student] = relationship(back_populates="historial")
    materia: Mapped[Course] = relationship(back_populates="historial")


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    estudiante_id: Mapped[str] = mapped_column(ForeignKey("students.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    estudiante: Mapped[Student] = relationship(back_populates="escenarios")
    eventos: Mapped[list["ScenarioEvent"]] = relationship(back_populates="escenario")
    resultados: Mapped[list["ScenarioResult"]] = relationship(back_populates="escenario")
    rutas: Mapped[list["SuggestedRoute"]] = relationship(back_populates="escenario")


class ScenarioEvent(Base):
    __tablename__ = "scenario_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    escenario_id: Mapped[str] = mapped_column(ForeignKey("scenarios.id"), nullable=False)
    materia_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    tipo_evento: Mapped[ScenarioEventType] = mapped_column(Enum(ScenarioEventType), nullable=False)

    escenario: Mapped[Scenario] = relationship(back_populates="eventos")


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    escenario_id: Mapped[str] = mapped_column(ForeignKey("scenarios.id"), nullable=False)
    materia_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    estado_simulado: Mapped[CourseStatus] = mapped_column(Enum(CourseStatus), nullable=False)

    escenario: Mapped[Scenario] = relationship(back_populates="resultados")


class SuggestedRoute(Base):
    __tablename__ = "suggested_routes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    escenario_id: Mapped[str] = mapped_column(ForeignKey("scenarios.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    semestre_estimado_graduacion: Mapped[int] = mapped_column(Integer, nullable=False)
    duracion_estimada: Mapped[int] = mapped_column(Integer, nullable=False)
    dificultad: Mapped[Difficulty] = mapped_column(Enum(Difficulty), nullable=False)
    carga_trabajo: Mapped[Workload] = mapped_column(Enum(Workload), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)

    escenario: Mapped[Scenario] = relationship(back_populates="rutas")
    pasos: Mapped[list["RouteStep"]] = relationship(back_populates="ruta")


class RouteStep(Base):
    __tablename__ = "route_steps"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    ruta_id: Mapped[str] = mapped_column(ForeignKey("suggested_routes.id"), nullable=False)
    materia_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    semestre_sugerido: Mapped[int] = mapped_column(Integer, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)

    ruta: Mapped[SuggestedRoute] = relationship(back_populates="pasos")


class CurriculumDocument(Base):
    __tablename__ = "curriculum_documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    programa_id: Mapped[str] = mapped_column(ForeignKey("programs.id"), nullable=False)
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_archivo: Mapped[str] = mapped_column(String(100), nullable=False)
    estado_procesamiento: Mapped[DocumentProcessingStatus] = mapped_column(
        Enum(DocumentProcessingStatus),
        nullable=False,
    )
    porcentaje_progreso: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fecha_carga: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    programa: Mapped[Program] = relationship(back_populates="documentos")
    extraccion: Mapped["DocumentExtraction | None"] = relationship(
        back_populates="documento",
        uselist=False,
    )
    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="documento")


class DocumentExtraction(Base):
    __tablename__ = "document_extractions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    documento_malla_id: Mapped[str] = mapped_column(
        ForeignKey("curriculum_documents.id"),
        nullable=False,
        unique=True,
    )
    texto_extraido: Mapped[str] = mapped_column(Text, nullable=False)
    metodo_extraccion: Mapped[ExtractionMethod] = mapped_column(Enum(ExtractionMethod), nullable=False)
    confianza_ocr: Mapped[float] = mapped_column(Float, nullable=False)
    fecha_procesamiento: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    documento: Mapped[CurriculumDocument] = relationship(back_populates="extraccion")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    documento_malla_id: Mapped[str] = mapped_column(ForeignKey("curriculum_documents.id"), nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    fuente: Mapped[str] = mapped_column(String(255), nullable=False)

    documento: Mapped[CurriculumDocument] = relationship(back_populates="chunks")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    estudiante_id: Mapped[str] = mapped_column(ForeignKey("students.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    estudiante: Mapped[Student] = relationship(back_populates="sesiones_chat")
    mensajes: Mapped[list["ChatMessage"]] = relationship(back_populates="sesion")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    chat_sesion_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id"), nullable=False)
    emisor: Mapped[ChatSender] = mapped_column(Enum(ChatSender), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    fuentes_opcionales: Mapped[str | None] = mapped_column(Text)

    sesion: Mapped[ChatSession] = relationship(back_populates="mensajes")
    consulta_rag: Mapped["RagQuery | None"] = relationship(back_populates="mensaje", uselist=False)


class RagQuery(Base):
    __tablename__ = "rag_queries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    chat_mensaje_id: Mapped[str] = mapped_column(
        ForeignKey("chat_messages.id"),
        nullable=False,
        unique=True,
    )
    pregunta: Mapped[str] = mapped_column(Text, nullable=False)
    contexto_recuperado: Mapped[str] = mapped_column(Text, nullable=False)
    fuentes_consultadas: Mapped[str] = mapped_column(Text, nullable=False)
    modelo_local: Mapped[LocalModel] = mapped_column(Enum(LocalModel), nullable=False)

    mensaje: Mapped[ChatMessage] = relationship(back_populates="consulta_rag")
