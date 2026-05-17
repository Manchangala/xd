from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.models.entities import CurriculumDocument, DocumentChunk
from app.models.enums import DocumentProcessingStatus, ExtractionMethod, ScenarioEventType
from app.services.chat_service import generate_answer
from app.services.local_llm_service import LocalProviderProbe, check_local_llm_connection
from app.services.pdf_processing import (
    ExtractedPage,
    PdfExtractionResult,
    _select_ocr_language,
    build_processing_diagnostics,
    detect_courses,
    detect_dependencies,
)
from app.services.rag_service import build_rag_context
from app.services.simulation_service import simulate_event


def test_cascade_blocks_indirect_dependents() -> None:
    with SessionLocal() as db:
        result = simulate_event(db, "student_1", "sys_inf102", ScenarioEventType.PERDIDA)
    assert result.materias_bloqueadas_directas == ["sys_inf201"]
    assert set(result.materias_bloqueadas_indirectas) >= {
        "sys_inf202",
        "sys_inf301",
        "sys_inf401",
    }


def test_rag_document_chunks_are_scoped_to_program() -> None:
    with SessionLocal() as db:
        db.add(
            CurriculumDocument(
                id="doc_business_test",
                programa_id="prog_business",
                nombre_archivo="malla_administracion.pdf",
                tipo_archivo="application/pdf",
                estado_procesamiento=DocumentProcessingStatus.CONVERTIDO_A_GRAFO,
                porcentaje_progreso=100,
                fecha_carga=datetime.now(timezone.utc),
            ),
        )
        db.add(
            DocumentChunk(
                id="chunk_business_test",
                documento_malla_id="doc_business_test",
                contenido="Contexto exclusivo de mercadeo cuántico.",
                orden=1,
                fuente="Página 1",
            ),
        )
        db.commit()

        context, _ = build_rag_context(
            db,
            "student_1",
            "¿Qué dice el documento sobre mercadeo cuántico?",
            program_id="prog_systems",
        )

    assert "mercadeo cuántico" not in context.lower()


def test_chat_answers_use_live_curriculum_state() -> None:
    with SessionLocal() as db:
        availability_answer = generate_answer(
            db,
            "student_1",
            "¿Puedo tomar Bases de Datos?",
        )
        failure_answer = generate_answer(
            db,
            "student_1",
            "¿Qué pasa si pierdo Programación II?",
        )
        simulation = simulate_event(db, "student_1", "sys_inf102", ScenarioEventType.PERDIDA)

    assert "Estructuras de Datos" in availability_answer
    assert f"bloquean {len(simulation.materias_bloqueadas)} materias" in failure_answer
    assert "Estructuras de Datos" in failure_answer


def test_ocr_language_selection_prefers_spanish_and_degrades_gracefully() -> None:
    assert _select_ocr_language(["eng", "spa"]) == "spa+eng"
    assert _select_ocr_language(["spa"]) == "spa"
    assert _select_ocr_language(["eng"]) == "eng"
    assert _select_ocr_language(["por"]) == "por"
    assert _select_ocr_language([]) is None


def test_pdf_processing_diagnostics_recommend_retry_for_scanned_pdf_without_ocr() -> None:
    diagnostics = build_processing_diagnostics(
        PdfExtractionResult(
            text="",
            method=ExtractionMethod.OCR_IMAGEN,
            confidence=0,
            pages=[ExtractedPage(number=1, text="", used_ocr=False)],
            scanned_like=True,
            ocr_available=False,
            ocr_language_used=None,
        ),
    )

    assert diagnostics.page_count == 1
    assert diagnostics.pages_without_text == 1
    assert diagnostics.can_retry_with_ocr is True
    assert diagnostics.recommended_action == "install_ocr_and_retry"


def test_pdf_processing_diagnostics_distinguish_manual_review_and_ready_review() -> None:
    blank = build_processing_diagnostics(
        PdfExtractionResult(
            text="",
            method=ExtractionMethod.TEXTO_PDF,
            confidence=0,
            pages=[ExtractedPage(number=1, text="", used_ocr=False)],
            scanned_like=False,
            ocr_available=False,
            ocr_language_used=None,
        ),
    )
    extracted = build_processing_diagnostics(
        PdfExtractionResult(
            text="INF101 Programación I",
            method=ExtractionMethod.TEXTO_PDF,
            confidence=0.99,
            pages=[ExtractedPage(number=1, text="INF101 Programación I", used_ocr=False)],
            scanned_like=False,
            ocr_available=False,
            ocr_language_used=None,
        ),
    )

    assert blank.recommended_action == "manual_review"
    assert blank.can_retry_with_ocr is False
    assert extracted.recommended_action == "review"
    assert extracted.pages_with_native_text == 1


def test_pdf_detection_accepts_university_codes_with_spaces() -> None:
    text = (
        "MAT 1031 | Álgebra Lineal | 3 | 1\n"
        "IST 2088 | Algoritmia y Programación I | 3 | 1\n"
        "IST 2088 -> IST 2089\n"
        "IST 7111 requiere IST 4031"
    )

    courses = detect_courses(text)
    dependencies = detect_dependencies(text)

    assert [course.codigo for course in courses] == ["MAT1031", "IST2088"]
    assert {dependency.materia for dependency in dependencies} == {"IST2089", "IST7111"}
    assert {dependency.requiere for dependency in dependencies} == {"IST2088", "IST4031"}


def test_llm_connection_diagnostics_cover_unreachable_missing_and_ready(monkeypatch) -> None:
    import app.services.local_llm_service as llm_service

    def raise_connection_error(_: str) -> LocalProviderProbe:
        raise RuntimeError("offline")

    monkeypatch.setattr(llm_service, "_probe_provider", raise_connection_error)
    unreachable = check_local_llm_connection("http://localhost:11434", "gemma")
    assert unreachable.connected is False
    assert unreachable.reachable is False
    assert unreachable.issues

    monkeypatch.setattr(
        llm_service,
        "_probe_provider",
        lambda _: LocalProviderProbe("ollama", "http://localhost:11434", ["llama3.2:latest"]),
    )
    missing = check_local_llm_connection("http://localhost:11434", "gemma")
    assert missing.connected is False
    assert missing.reachable is True
    assert missing.resolved_model is None
    assert "no está instalado" in missing.issues[0]
    assert missing.provider == "ollama"

    monkeypatch.setattr(
        llm_service,
        "_probe_provider",
        lambda _: LocalProviderProbe(
            "openai_compatible",
            "http://localhost:1234",
            ["google/gemma-3-4b"],
        ),
    )
    ready = check_local_llm_connection("http://localhost:11434", "gemma")
    assert ready.connected is True
    assert ready.reachable is True
    assert ready.provider == "openai_compatible"
    assert ready.base_url == "http://localhost:1234"
    assert ready.resolved_model == "google/gemma-3-4b"
    assert ready.issues == []

    other = check_local_llm_connection("http://localhost:11434", "otro")
    assert other.connected is True
    assert other.resolved_model == "google/gemma-3-4b"
