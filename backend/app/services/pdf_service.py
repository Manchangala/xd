from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import (
    Course,
    CourseDependency,
    CurriculumDocument,
    CurriculumVersion,
    DocumentChunk,
    DocumentExtraction,
    Program,
)
from app.models.enums import DependencyType, DocumentProcessingStatus, ExtractionMethod
from app.schemas.pdf import (
    ApproveGraphRequest,
    ApproveGraphResponse,
    PdfProcessResponse,
)
from app.services.pdf_processing import (
    build_page_chunks,
    build_processing_diagnostics,
    detect_courses,
    detect_dependencies,
    extract_pdf_text,
)

settings = get_settings()


def _document_path(document_id: str) -> Path:
    storage_dir = Path(settings.document_storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir / f"{document_id}.pdf"


def _raise_graph_validation_error(detail: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=detail,
    )


def _would_create_prerequisite_cycle(
    adjacency: dict[str, set[str]],
    materia_id: str,
    materia_requerida_id: str,
) -> bool:
    pending = [materia_requerida_id]
    visited: set[str] = set()
    while pending:
        current = pending.pop()
        if current == materia_id:
            return True
        if current in visited:
            continue
        visited.add(current)
        pending.extend(adjacency.get(current, set()))
    return False


def upload_pdf(db: Session, file: UploadFile, program_id: str) -> CurriculumDocument:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Solo se permiten archivos PDF",
        )
    if not db.get(Program, program_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programa no encontrado")
    document = CurriculumDocument(
        id=f"doc_{uuid4().hex[:10]}",
        programa_id=program_id,
        nombre_archivo=file.filename or "malla.pdf",
        tipo_archivo=file.content_type,
        estado_procesamiento=DocumentProcessingStatus.PENDIENTE,
        porcentaje_progreso=0,
        fecha_carga=datetime.now(timezone.utc),
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    _document_path(document.id).write_bytes(file.file.read())
    return document


def process_pdf(db: Session, document_id: str) -> PdfProcessResponse:
    document = db.get(CurriculumDocument, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")
    path = _document_path(document.id)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo físico del documento no encontrado",
        )

    document.estado_procesamiento = DocumentProcessingStatus.EXTRAYENDO_TEXTO
    document.porcentaje_progreso = 25
    db.commit()

    try:
        extraction_result = extract_pdf_text(path)
    except Exception as exc:
        document.estado_procesamiento = DocumentProcessingStatus.ERROR
        document.porcentaje_progreso = 100
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No se pudo leer el PDF cargado",
        ) from exc
    document.estado_procesamiento = (
        DocumentProcessingStatus.OCR
        if extraction_result.method == ExtractionMethod.OCR_IMAGEN
        else DocumentProcessingStatus.PROCESANDO
    )
    document.porcentaje_progreso = 60
    db.commit()

    db.execute(delete(DocumentChunk).where(DocumentChunk.documento_malla_id == document.id))
    db.execute(
        delete(DocumentExtraction).where(DocumentExtraction.documento_malla_id == document.id),
    )

    extraction = DocumentExtraction(
        id=f"extract_{uuid4().hex[:10]}",
        documento_malla_id=document.id,
        texto_extraido=extraction_result.text,
        metodo_extraccion=extraction_result.method,
        confianza_ocr=extraction_result.confidence,
        fecha_procesamiento=datetime.now(timezone.utc),
    )
    chunks = [
        DocumentChunk(
            id=f"chunk_{uuid4().hex[:10]}",
            documento_malla_id=document.id,
            contenido=content,
            orden=order,
            fuente=source,
        )
        for content, order, source in build_page_chunks(extraction_result.pages)
    ]
    courses = detect_courses(extraction_result.text)
    dependencies = detect_dependencies(extraction_result.text)
    diagnostics = build_processing_diagnostics(extraction_result)
    document.estado_procesamiento = (
        DocumentProcessingStatus.VALIDANDO
        if extraction_result.text
        else DocumentProcessingStatus.ERROR
    )
    document.porcentaje_progreso = 85 if extraction_result.text else 100

    db.add_all([document, extraction, *chunks])
    db.commit()
    db.refresh(document)
    db.refresh(extraction)
    return PdfProcessResponse(
        document=document,
        extraction=extraction,
        courses=courses,
        dependencies=dependencies,
        diagnostics=diagnostics,
    )


def approve_graph(
    db: Session,
    document_id: str,
    payload: ApproveGraphRequest,
) -> ApproveGraphResponse:
    document = db.get(CurriculumDocument, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")
    version = db.get(CurriculumVersion, payload.version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Versión de malla no encontrada",
        )
    if version.programa_id != document.programa_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La versión seleccionada no pertenece al programa del documento",
        )

    normalized_payload_codes = [course.codigo.strip().upper() for course in payload.courses]
    if any(not code for code in normalized_payload_codes):
        _raise_graph_validation_error("Hay materias sin código en la revisión aprobada")
    if len(set(normalized_payload_codes)) != len(normalized_payload_codes):
        _raise_graph_validation_error("Hay materias duplicadas en la revisión aprobada")

    created_courses = 0
    updated_courses = 0
    existing_courses = {
        course.codigo.strip().upper(): course
        for course in db.scalars(
            select(Course).where(Course.version_malla_id == payload.version_id),
        )
    }
    for detected_course in payload.courses:
        normalized_code = detected_course.codigo.strip().upper()
        course = existing_courses.get(normalized_code)
        if course:
            course.nombre = detected_course.nombre
            course.creditos = detected_course.creditos
            course.semestre_sugerido = detected_course.semestre
            updated_courses += 1
        else:
            course = Course(
                id=f"course_{uuid4().hex[:10]}",
                version_malla_id=payload.version_id,
                codigo=normalized_code,
                nombre=detected_course.nombre,
                creditos=detected_course.creditos,
                semestre_sugerido=detected_course.semestre,
                electiva=False,
            )
            db.add(course)
            existing_courses[course.codigo] = course
            created_courses += 1

    db.flush()

    created_dependencies = 0
    version_course_ids = {course.id for course in existing_courses.values()}
    existing_dependency_keys = {
        (dependency.materia_id, dependency.materia_requerida_id, dependency.tipo)
        for dependency in db.scalars(
            select(CourseDependency).where(
                CourseDependency.materia_id.in_(version_course_ids),
                CourseDependency.materia_requerida_id.in_(version_course_ids),
            ),
        )
    }
    prerequisite_adjacency: dict[str, set[str]] = {}
    for materia_id, materia_requerida_id, dependency_type in existing_dependency_keys:
        if dependency_type == DependencyType.PREREQUISITO:
            prerequisite_adjacency.setdefault(materia_id, set()).add(materia_requerida_id)

    seen_payload_dependencies: set[tuple[str, str, DependencyType]] = set()
    for detected_dependency in payload.dependencies:
        course = existing_courses.get(detected_dependency.materia.strip().upper())
        required = existing_courses.get(detected_dependency.requiere.strip().upper())
        if not course or not required:
            _raise_graph_validation_error(
                "Hay dependencias con materias no reconocidas en la revisión aprobada",
            )
        if course.id == required.id:
            _raise_graph_validation_error("Una materia no puede depender de sí misma")
        key = (course.id, required.id, detected_dependency.tipo)
        if key in seen_payload_dependencies:
            _raise_graph_validation_error("Hay dependencias duplicadas en la revisión aprobada")
        seen_payload_dependencies.add(key)
        if key in existing_dependency_keys:
            continue
        if (
            detected_dependency.tipo == DependencyType.PREREQUISITO
            and _would_create_prerequisite_cycle(
                prerequisite_adjacency,
                course.id,
                required.id,
            )
        ):
            _raise_graph_validation_error("La revisión aprobada crearía un ciclo de prerrequisitos")
        db.add(
            CourseDependency(
                id=f"dep_{uuid4().hex[:10]}",
                materia_id=course.id,
                materia_requerida_id=required.id,
                tipo=detected_dependency.tipo,
            ),
        )
        existing_dependency_keys.add(key)
        if detected_dependency.tipo == DependencyType.PREREQUISITO:
            prerequisite_adjacency.setdefault(course.id, set()).add(required.id)
        created_dependencies += 1

    document.estado_procesamiento = DocumentProcessingStatus.CONVERTIDO_A_GRAFO
    document.porcentaje_progreso = 100
    db.commit()
    return ApproveGraphResponse(
        document_id=document_id,
        approved=True,
        created_courses=created_courses,
        updated_courses=updated_courses,
        created_dependencies=created_dependencies,
        message="Grafo aprobado y persistido en la versión de malla seleccionada.",
    )
