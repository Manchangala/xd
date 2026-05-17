from __future__ import annotations

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import pymupdf

from app.models.enums import DependencyType, ExtractionMethod
from app.schemas.pdf import (
    DetectedCourseResponse,
    DetectedDependencyResponse,
    OcrStatusResponse,
    PdfProcessingDiagnostics,
)

CODE_PATTERN = r"[A-Z]{2,6}\s*\d{2,5}"


@dataclass(slots=True)
class ExtractedPage:
    number: int
    text: str
    used_ocr: bool


@dataclass(slots=True)
class PdfExtractionResult:
    text: str
    method: ExtractionMethod
    confidence: float
    pages: list[ExtractedPage]
    scanned_like: bool
    ocr_available: bool
    ocr_language_used: str | None


def _compact_spaces(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\r", "\n")).strip()


def _normalize_course_code(value: str) -> str:
    return re.sub(r"\s+", "", value.strip().upper())


def _list_tesseract_languages(engine_path: str) -> list[str]:
    try:
        completed = subprocess.run(
            [engine_path, "--list-langs"],
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except Exception:
        return []
    return [
        line.strip()
        for line in completed.stdout.splitlines()
        if line.strip() and not line.lower().startswith("list of available")
    ]


def _select_ocr_language(languages: list[str]) -> str | None:
    normalized = {language.lower(): language for language in languages}
    spanish = next((value for key, value in normalized.items() if key.startswith("spa")), None)
    english = next((value for key, value in normalized.items() if key.startswith("eng")), None)
    if spanish and english:
        return f"{spanish}+{english}"
    if spanish:
        return spanish
    if english:
        return english
    return languages[0] if languages else None


def _try_ocr(page: pymupdf.Page, language: str | None) -> str:
    if not language:
        return ""
    try:
        textpage = page.get_textpage_ocr(language=language, dpi=300, full=True)
        return _compact_spaces(page.get_text("text", textpage=textpage))
    except Exception:
        return ""


def get_ocr_status() -> OcrStatusResponse:
    engine_path = shutil.which("tesseract")
    if not engine_path:
        return OcrStatusResponse(
            available=False,
            engine=None,
            installed_path=None,
            languages=[],
            spanish_language_available=False,
            ready_for_scanned_pdfs=False,
            issues=["No se encontró el ejecutable de Tesseract en PATH."],
            next_steps=[
                "Instala Tesseract OCR localmente.",
                "Asegura que el comando tesseract quede disponible en PATH.",
                "Reinicia el backend después de instalarlo.",
            ],
            message="Tesseract no está instalado o no está disponible en PATH.",
        )

    languages = _list_tesseract_languages(engine_path)

    spanish_available = any(language.lower().startswith("spa") for language in languages)
    issues = [] if spanish_available else ["Tesseract está instalado, pero no se detectó el idioma español."]
    next_steps = (
        []
        if spanish_available
        else [
            "Instala el paquete de idioma spa para mejorar la lectura de mallas en español.",
            "Verifica con tesseract --list-langs que aparezca spa.",
        ]
    )
    return OcrStatusResponse(
        available=True,
        engine="tesseract",
        installed_path=engine_path,
        languages=languages,
        spanish_language_available=spanish_available,
        ready_for_scanned_pdfs=spanish_available,
        issues=issues,
        next_steps=next_steps,
        message=(
            "OCR local listo para PDFs escaneados."
            if spanish_available
            else "OCR local detectado, pero falta el idioma español."
        ),
    )


def extract_pdf_text(path: Path) -> PdfExtractionResult:
    pages: list[ExtractedPage] = []
    used_native_text = False
    used_ocr = False
    scanned_like = False
    engine_path = shutil.which("tesseract")
    ocr_language = (
        _select_ocr_language(_list_tesseract_languages(engine_path))
        if engine_path
        else None
    )

    with pymupdf.open(path) as document:
        for index, page in enumerate(document, start=1):
            native_text = _compact_spaces(page.get_text("text"))
            page_text = native_text
            page_used_ocr = False

            if native_text:
                used_native_text = True
            else:
                scanned_like = scanned_like or bool(page.get_images(full=True))
                page_text = _try_ocr(page, ocr_language)
                page_used_ocr = bool(page_text)
                used_ocr = used_ocr or page_used_ocr

            pages.append(
                ExtractedPage(
                    number=index,
                    text=page_text,
                    used_ocr=page_used_ocr,
                ),
            )

    combined_text = "\n\n".join(page.text for page in pages if page.text)
    if used_native_text and used_ocr:
        method = ExtractionMethod.MIXTO
        confidence = 0.88
    elif used_ocr:
        method = ExtractionMethod.OCR_IMAGEN
        confidence = 0.78
    elif combined_text:
        method = ExtractionMethod.TEXTO_PDF
        confidence = 0.99
    elif scanned_like:
        method = ExtractionMethod.OCR_IMAGEN
        confidence = 0.0
    else:
        method = ExtractionMethod.TEXTO_PDF
        confidence = 0.0

    return PdfExtractionResult(
        text=combined_text,
        method=method,
        confidence=confidence,
        pages=pages,
        scanned_like=scanned_like,
        ocr_available=bool(engine_path),
        ocr_language_used=ocr_language,
    )


def build_processing_diagnostics(
    extraction: PdfExtractionResult,
) -> PdfProcessingDiagnostics:
    page_count = len(extraction.pages)
    pages_with_native_text = sum(
        1 for page in extraction.pages if page.text and not page.used_ocr
    )
    pages_using_ocr = sum(1 for page in extraction.pages if page.used_ocr)
    pages_without_text = sum(1 for page in extraction.pages if not page.text)
    can_retry_with_ocr = (
        extraction.scanned_like
        and not extraction.text
        and not extraction.ocr_language_used
    )

    if can_retry_with_ocr:
        recommended_action = "install_ocr_and_retry"
        message = (
            "El documento parece escaneado como imagen y no se pudo aplicar OCR local. "
            "Instala o configura el motor OCR y vuelve a procesar este mismo archivo."
        )
    elif extraction.scanned_like and not extraction.text:
        recommended_action = "manual_review"
        message = (
            "El documento parece escaneado como imagen, pero el OCR no produjo texto útil. "
            "Revisa la calidad del archivo o corrige manualmente."
        )
    elif not extraction.text:
        recommended_action = "manual_review"
        message = (
            "No se encontró texto aprovechable en el PDF. Revisa el archivo o carga otra versión."
        )
    else:
        recommended_action = "review"
        message = (
            "Se extrajo texto del PDF. Revisa las materias y dependencias antes de guardar."
        )

    return PdfProcessingDiagnostics(
        page_count=page_count,
        pages_with_native_text=pages_with_native_text,
        pages_using_ocr=pages_using_ocr,
        pages_without_text=pages_without_text,
        scanned_like=extraction.scanned_like,
        ocr_available=extraction.ocr_available,
        ocr_language_used=extraction.ocr_language_used,
        can_retry_with_ocr=can_retry_with_ocr,
        recommended_action=recommended_action,
        message=message,
    )


def build_page_chunks(pages: list[ExtractedPage]) -> list[tuple[str, int, str]]:
    return [
        (page.text, index, f"Página {page.number}")
        for index, page in enumerate(pages, start=1)
        if page.text
    ]


def _course_from_parts(
    code: str,
    name: str,
    credits: str,
    semester: str,
    confidence: float,
) -> DetectedCourseResponse | None:
    clean_name = name.strip(" -|;")
    if not clean_name:
        return None
    return DetectedCourseResponse(
        codigo=_normalize_course_code(code),
        nombre=clean_name,
        creditos=int(credits),
        semestre=int(semester),
        confianza=confidence,
    )


def detect_courses(text: str) -> list[DetectedCourseResponse]:
    detected: dict[str, DetectedCourseResponse] = {}
    natural_pattern = re.compile(
        rf"^(?P<codigo>{CODE_PATTERN})\s+"
        r"(?P<nombre>.+?)\s+"
        r"(?P<creditos>\d{1,2})\s*"
        r"(?:cr(?:éditos?)?|cr\.)\s+"
        r"(?:semestre|sem\.?)\s*(?P<semestre>\d{1,2})$",
        re.IGNORECASE,
    )

    for raw_line in text.splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue

        if any(separator in line for separator in ("|", ";", "\t")):
            parts = [part.strip() for part in re.split(r"[|;\t]", line) if part.strip()]
            if len(parts) >= 4 and re.fullmatch(CODE_PATTERN, parts[0]):
                course = _course_from_parts(parts[0], parts[1], parts[2], parts[3], 0.99)
                if course:
                    detected[course.codigo] = course
                continue

        hyphen_parts = [part.strip() for part in line.split(" - ") if part.strip()]
        if len(hyphen_parts) >= 4 and re.fullmatch(CODE_PATTERN, hyphen_parts[0]):
            credits = re.search(r"\d{1,2}", hyphen_parts[2])
            semester = re.search(r"\d{1,2}", hyphen_parts[3])
            if credits and semester:
                course = _course_from_parts(
                    hyphen_parts[0],
                    hyphen_parts[1],
                    credits.group(),
                    semester.group(),
                    0.97,
                )
                if course:
                    detected[course.codigo] = course
                continue

        natural_match = natural_pattern.match(line)
        if natural_match:
            course = _course_from_parts(
                natural_match.group("codigo"),
                natural_match.group("nombre"),
                natural_match.group("creditos"),
                natural_match.group("semestre"),
                0.95,
            )
            if course:
                detected[course.codigo] = course

    return list(detected.values())


def detect_dependencies(text: str) -> list[DetectedDependencyResponse]:
    detected: dict[tuple[str, str, DependencyType], DetectedDependencyResponse] = {}
    explicit_pattern = re.compile(
        rf"(?P<materia>{CODE_PATTERN})\s+"
        r"(?P<tipo>requiere|prerrequisito(?:\s+de)?|correquisito(?:\s+de)?)\s+"
        rf"(?P<requiere>{CODE_PATTERN})",
        re.IGNORECASE,
    )

    for raw_line in text.splitlines():
        line = _compact_spaces(raw_line)
        if not line:
            continue

        if "->" in line:
            chain = [_normalize_course_code(code) for code in re.findall(CODE_PATTERN, line)]
            for required, course in zip(chain, chain[1:], strict=False):
                key = (course, required, DependencyType.PREREQUISITO)
                detected[key] = DetectedDependencyResponse(
                    materia=course,
                    requiere=required,
                    tipo=DependencyType.PREREQUISITO,
                    confianza=0.98,
                )

        for match in explicit_pattern.finditer(line):
            dependency_type = (
                DependencyType.CORREQUISITO
                if "correquisito" in match.group("tipo").lower()
                else DependencyType.PREREQUISITO
            )
            course_code = _normalize_course_code(match.group("materia"))
            required_code = _normalize_course_code(match.group("requiere"))
            key = (course_code, required_code, dependency_type)
            detected[key] = DetectedDependencyResponse(
                materia=course_code,
                requiere=required_code,
                tipo=dependency_type,
                confianza=0.97,
            )

    return list(detected.values())
