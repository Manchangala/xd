from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import (
    AdminActivity,
    Course,
    CourseDependency,
    CurriculumVersion,
    Program,
    Student,
)
from app.models.enums import DependencyType
from app.schemas.admin import (
    AdminDashboardResponse,
    AdminOverviewResponse,
    SystemCheckResponse,
    SystemStatusResponse,
    VersionCreate,
    VersionUpdate,
)
from app.schemas.curriculum import CourseCreate, CourseUpdate, ProgramCreate, ProgramUpdate
from app.services.pdf_processing import get_ocr_status


def _record_activity(db: Session, descripcion: str, tipo: str) -> None:
    db.add(
        AdminActivity(
            id=f"activity_{uuid4().hex[:10]}",
            descripcion=descripcion,
            tipo=tipo,
        ),
    )


def _ensure_program_code_available(
    db: Session,
    codigo: str,
    *,
    exclude_program_id: str | None = None,
) -> None:
    query = select(Program).where(func.lower(Program.codigo) == codigo.lower())
    if exclude_program_id:
        query = query.where(Program.id != exclude_program_id)
    if db.scalar(query):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ya existe un programa con ese código",
        )


def _ensure_course_code_available(
    db: Session,
    version_malla_id: str,
    codigo: str,
    *,
    exclude_course_id: str | None = None,
) -> None:
    query = select(Course).where(
        Course.version_malla_id == version_malla_id,
        func.lower(Course.codigo) == codigo.lower(),
    )
    if exclude_course_id:
        query = query.where(Course.id != exclude_course_id)
    if db.scalar(query):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Ya existe una materia con ese código en la versión seleccionada",
        )


def _get_version_or_404(db: Session, version_id: str) -> CurriculumVersion:
    version = db.get(CurriculumVersion, version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versión no encontrada")
    return version


def _get_program_or_404(db: Session, program_id: str) -> Program:
    program = db.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")
    return program


def _get_course_or_404(db: Session, course_id: str) -> Course:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")
    return course


def _creates_prerequisite_cycle(
    db: Session,
    materia_id: str,
    materia_requerida_id: str,
) -> bool:
    prerequisites = list(
        db.scalars(
            select(CourseDependency).where(CourseDependency.tipo == DependencyType.PREREQUISITO),
        ),
    )
    adjacency: dict[str, list[str]] = {}
    for dependency in prerequisites:
        adjacency.setdefault(dependency.materia_id, []).append(dependency.materia_requerida_id)

    pending = [materia_requerida_id]
    visited: set[str] = set()
    while pending:
        current = pending.pop()
        if current == materia_id:
            return True
        if current in visited:
            continue
        visited.add(current)
        pending.extend(adjacency.get(current, []))
    return False


def get_overview(db: Session) -> AdminOverviewResponse:
    students = db.scalar(select(func.count()).select_from(Student)) or 0
    programs = db.scalar(select(func.count()).select_from(Program)) or 0
    courses = db.scalar(select(func.count()).select_from(Course)) or 0
    return AdminOverviewResponse(
        estudiantes_activos=students,
        programas=programs,
        total_materias=courses,
        completitud_promedio=82,
    )


def get_dashboard_data(db: Session) -> AdminDashboardResponse:
    return AdminDashboardResponse(
        programas=list(db.scalars(select(Program).order_by(Program.nombre))),
        materias=list(db.scalars(select(Course).order_by(Course.codigo))),
        versiones=list(db.scalars(select(CurriculumVersion).order_by(CurriculumVersion.id))),
        dependencias=list(db.scalars(select(CourseDependency).order_by(CourseDependency.id))),
        activities=list(
            db.scalars(
                select(AdminActivity).order_by(AdminActivity.fecha.desc()).limit(8),
            ),
        ),
    )


def get_system_status(db: Session) -> SystemStatusResponse:
    settings = get_settings()
    checks: list[SystemCheckResponse] = []

    checks.append(
        SystemCheckResponse(
            id="api",
            nombre="API REST",
            estado="ok",
            detalle=f"{settings.app_name} responde en entorno {settings.environment}.",
        ),
    )

    try:
        db.execute(text("SELECT 1"))
        checks.append(
            SystemCheckResponse(
                id="database",
                nombre="Base de datos",
                estado="ok",
                detalle="La conexión de base de datos respondió correctamente.",
            ),
        )
    except Exception as exc:
        checks.append(
            SystemCheckResponse(
                id="database",
                nombre="Base de datos",
                estado="error",
                detalle=f"No se pudo validar la base de datos: {exc}",
                accion_recomendada="Revisar DATABASE_URL, migraciones y disponibilidad del motor.",
            ),
        )

    ocr = get_ocr_status()
    checks.append(
        SystemCheckResponse(
            id="ocr",
            nombre="OCR local",
            estado="ok" if ocr.ready_for_scanned_pdfs else ("warning" if ocr.available else "error"),
            detalle=ocr.message,
            accion_recomendada=" ".join(ocr.next_steps) if ocr.next_steps else None,
        ),
    )

    checks.append(
        SystemCheckResponse(
            id="llm",
            nombre="LLM local / RAG",
            estado="warning",
            detalle=(
                "RAG está operativo con contexto académico. El LLM local se valida desde "
                "Configuración o desde /llm/connect para no bloquear el panel administrativo."
            ),
            accion_recomendada=(
                "Configurar Gemma, Llama o Mistral local si se requiere generación real "
                "sin fallback mock."
            ),
        ),
    )

    security_ok = settings.secure_headers_enabled and (
        not settings.is_production or settings.enforce_https
    )
    checks.append(
        SystemCheckResponse(
            id="security",
            nombre="Seguridad HTTP",
            estado="ok" if security_ok else "warning",
            detalle=(
                "Headers de seguridad activos"
                if settings.secure_headers_enabled
                else "Headers de seguridad desactivados"
            )
            + (
                " y HTTPS exigido."
                if settings.enforce_https
                else "; HTTPS no forzado en este entorno."
            ),
            accion_recomendada=(
                None
                if security_ok
                else "Activar SECURE_HEADERS_ENABLED y ENFORCE_HTTPS antes de producción."
            ),
        ),
    )

    try:
        settings.validate_runtime_security()
        config_state = "ok"
        config_detail = "La configuración actual cumple las validaciones del entorno."
        config_action = None
    except RuntimeError as exc:
        config_state = "error"
        config_detail = str(exc)
        config_action = "Corregir variables de entorno antes de publicar."

    checks.append(
        SystemCheckResponse(
            id="configuration",
            nombre="Configuración",
            estado=config_state,
            detalle=config_detail,
            accion_recomendada=config_action,
        ),
    )

    return SystemStatusResponse(
        environment=settings.environment,
        app_name=settings.app_name,
        checks=checks,
    )


def create_program(db: Session, payload: ProgramCreate) -> Program:
    _ensure_program_code_available(db, payload.codigo)
    program = Program(id=f"prog_{uuid4().hex[:10]}", **payload.model_dump())
    db.add(program)
    _record_activity(db, f"Programa creado: {program.codigo} · {program.nombre}", "malla")
    db.commit()
    db.refresh(program)
    return program


def update_program(db: Session, program_id: str, payload: ProgramUpdate) -> Program:
    program = _get_program_or_404(db, program_id)
    updates = payload.model_dump(exclude_unset=True)
    if "codigo" in updates and updates["codigo"] is not None:
        _ensure_program_code_available(db, updates["codigo"], exclude_program_id=program.id)
    for key, value in updates.items():
        setattr(program, key, value)
    db.add(program)
    _record_activity(db, f"Programa actualizado: {program.codigo} · {program.nombre}", "malla")
    db.commit()
    db.refresh(program)
    return program


def create_course(db: Session, payload: CourseCreate) -> Course:
    _get_version_or_404(db, payload.version_malla_id)
    _ensure_course_code_available(db, payload.version_malla_id, payload.codigo)
    course = Course(id=f"course_{uuid4().hex[:10]}", **payload.model_dump())
    db.add(course)
    _record_activity(db, f"Materia creada: {course.codigo} · {course.nombre}", "materia")
    db.commit()
    db.refresh(course)
    return course


def update_course(db: Session, course_id: str, payload: CourseUpdate) -> Course:
    course = _get_course_or_404(db, course_id)
    updates = payload.model_dump(exclude_unset=True)
    next_version_id = updates.get("version_malla_id", course.version_malla_id)
    next_codigo = updates.get("codigo", course.codigo)
    _get_version_or_404(db, next_version_id)
    _ensure_course_code_available(
        db,
        next_version_id,
        next_codigo,
        exclude_course_id=course.id,
    )
    for key, value in updates.items():
        setattr(course, key, value)
    db.add(course)
    _record_activity(db, f"Materia actualizada: {course.codigo} · {course.nombre}", "materia")
    db.commit()
    db.refresh(course)
    return course


def create_version(db: Session, payload: VersionCreate) -> CurriculumVersion:
    _get_program_or_404(db, payload.programa_id)
    if payload.activa:
        current_versions = list(
            db.scalars(
                select(CurriculumVersion).where(CurriculumVersion.programa_id == payload.programa_id),
            ),
        )
        for version in current_versions:
            version.activa = False
            db.add(version)
    version = CurriculumVersion(id=f"version_{uuid4().hex[:10]}", **payload.model_dump())
    db.add(version)
    _record_activity(db, f"Versión de malla creada: {version.nombre_version}", "malla")
    db.commit()
    db.refresh(version)
    return version


def update_version(db: Session, version_id: str, payload: VersionUpdate) -> CurriculumVersion:
    version = _get_version_or_404(db, version_id)
    updates = payload.model_dump(exclude_unset=True)
    target_program_id = updates.get("programa_id", version.programa_id)
    _get_program_or_404(db, target_program_id)

    if (
        target_program_id != version.programa_id
        and version.activa
        and not db.scalar(
            select(CurriculumVersion).where(
                CurriculumVersion.programa_id == version.programa_id,
                CurriculumVersion.id != version.id,
                CurriculumVersion.activa.is_(True),
            ),
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No puedes mover la única versión activa de un programa",
        )

    should_be_active = updates.get("activa", version.activa)
    if should_be_active:
        siblings = list(
            db.scalars(
                select(CurriculumVersion).where(
                    CurriculumVersion.programa_id == target_program_id,
                    CurriculumVersion.id != version.id,
                ),
            ),
        )
        for sibling in siblings:
            sibling.activa = False
            db.add(sibling)
    for key, value in updates.items():
        setattr(version, key, value)
    db.add(version)
    _record_activity(db, f"Versión de malla actualizada: {version.nombre_version}", "malla")
    db.commit()
    db.refresh(version)
    return version


def toggle_version(db: Session, version_id: str) -> CurriculumVersion:
    version = _get_version_or_404(db, version_id)
    siblings = list(
        db.scalars(
            select(CurriculumVersion).where(CurriculumVersion.programa_id == version.programa_id),
        ),
    )
    active_siblings = [item for item in siblings if item.activa]
    if version.activa and len(active_siblings) <= 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Debe existir al menos una versión activa por programa",
        )
    version.activa = not version.activa
    if version.activa:
        for sibling in siblings:
            if sibling.id != version.id:
                sibling.activa = False
                db.add(sibling)
    db.add(version)
    _record_activity(
        db,
        f"Versión de malla {'activada' if version.activa else 'desactivada'}: {version.nombre_version}",
        "malla",
    )
    db.commit()
    db.refresh(version)
    return version


def create_dependency(
    db: Session,
    materia_id: str,
    materia_requerida_id: str,
    tipo: DependencyType,
) -> CourseDependency:
    materia = _get_course_or_404(db, materia_id)
    materia_requerida = _get_course_or_404(db, materia_requerida_id)
    if materia.id == materia_requerida.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Una materia no puede depender de sí misma",
        )
    if materia.version_malla_id != materia_requerida.version_malla_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Las dependencias solo pueden crearse dentro de la misma versión de malla",
        )
    duplicated = db.scalar(
        select(CourseDependency).where(
            CourseDependency.materia_id == materia_id,
            CourseDependency.materia_requerida_id == materia_requerida_id,
            CourseDependency.tipo == tipo,
        ),
    )
    if duplicated:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La dependencia ya existe",
        )
    if tipo == DependencyType.PREREQUISITO and _creates_prerequisite_cycle(
        db,
        materia_id,
        materia_requerida_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La dependencia crearía un ciclo de prerrequisitos",
        )
    dependency = CourseDependency(
        id=f"dependency_{uuid4().hex[:10]}",
        materia_id=materia_id,
        materia_requerida_id=materia_requerida_id,
        tipo=tipo,
    )
    db.add(dependency)
    _record_activity(
        db,
        f"Dependencia creada: {materia.codigo} requiere {materia_requerida.codigo}",
        "dependencia",
    )
    db.commit()
    db.refresh(dependency)
    return dependency


def delete_dependency(db: Session, dependency_id: str) -> dict[str, str | bool]:
    dependency = db.get(CourseDependency, dependency_id)
    if not dependency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dependencia no encontrada")
    materia = _get_course_or_404(db, dependency.materia_id)
    materia_requerida = _get_course_or_404(db, dependency.materia_requerida_id)
    db.delete(dependency)
    _record_activity(
        db,
        f"Dependencia eliminada: {materia.codigo} ya no requiere {materia_requerida.codigo}",
        "dependencia",
    )
    db.commit()
    return {"dependencyId": dependency_id, "deleted": True}
