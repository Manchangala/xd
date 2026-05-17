from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import CurriculumDocument, DocumentChunk, Scenario
from app.models.enums import DocumentProcessingStatus
from app.services.curriculum_service import get_curriculum_graph, get_progress_summary


@dataclass(slots=True)
class RagContextItem:
    source: str
    content: str
    lexical_score: float
    source_bonus: float
    score: float


def _normalize(value: str) -> str:
    ascii_text = "".join(
        character
        for character in unicodedata.normalize("NFKD", value.lower())
        if not unicodedata.combining(character)
    )
    return re.sub(r"[^a-z0-9]+", " ", ascii_text).strip()


def _tokens(value: str) -> set[str]:
    return {token for token in _normalize(value).split() if len(token) > 1}


def _score(question: str, content: str) -> float:
    query_tokens = _tokens(question)
    content_tokens = _tokens(content)
    if not query_tokens or not content_tokens:
        return 0.0
    overlap = len(query_tokens & content_tokens)
    exact_bonus = 2.0 if _normalize(question) in _normalize(content) else 0.0
    return overlap + exact_bonus


def _source_bonus(question: str, source: str) -> float:
    normalized_question = _normalize(question)
    normalized_source = _normalize(source)
    if "documento" in normalized_question and "documento pdf procesado" in normalized_source:
        return 3.0
    if "historial" in normalized_question and "historial academico" in normalized_source:
        return 3.0
    if "escenario" in normalized_question and "escenario guardado" in normalized_source:
        return 3.0
    if "grafo" in normalized_question and "grafo curricular" in normalized_source:
        return 3.0
    return 0.0


def _requested_source_labels(question: str) -> set[str]:
    normalized_question = _normalize(question)
    requested_sources = set()
    if "documento" in normalized_question:
        requested_sources.add("documento pdf procesado")
    if "historial" in normalized_question:
        requested_sources.add("historial academico")
    if "escenario" in normalized_question:
        requested_sources.add("escenario guardado")
    if "grafo" in normalized_question:
        requested_sources.add("grafo curricular")
    return requested_sources


def _matches_requested_source(item: RagContextItem, requested_sources: set[str]) -> bool:
    normalized_source = _normalize(item.source)
    return any(source in normalized_source for source in requested_sources)


def build_rag_context(
    db: Session,
    student_id: str,
    question: str,
    *,
    program_id: str = "prog_systems",
    limit: int = 4,
) -> tuple[str, list[str]]:
    graph = get_curriculum_graph(db, program_id, student_id)
    summary = get_progress_summary(db, student_id, program_id)
    candidates: list[tuple[str, str]] = [
        (
            "grafo curricular",
            (
                f"{course.codigo} {course.nombre}. Estado: {course.estado}. "
                f"Prerrequisitos: {', '.join(item.codigo for item in course.prerequisitos) or 'ninguno'}. "
                f"Dependientes: {', '.join(item.codigo for item in course.dependientes) or 'ninguno'}."
            ),
        )
        for course in graph.materias
    ]
    candidates.append(
        (
            "historial académico",
            (
                f"Créditos aprobados: {summary.creditos_aprobados} de {summary.total_creditos}. "
                f"Materias disponibles próximo semestre: "
                f"{', '.join(course.codigo for course in summary.disponibles_proximo_semestre)}."
            ),
        ),
    )
    candidates.extend(
        (
            "escenario guardado",
            f"{scenario.nombre}. {scenario.descripcion}",
        )
        for scenario in db.scalars(
            select(Scenario)
            .where(Scenario.estudiante_id == student_id)
            .order_by(Scenario.actualizado_en.desc()),
        )
    )
    candidates.extend(
        (
            f"documento PDF procesado · {chunk.fuente}",
            chunk.contenido,
        )
        for chunk in db.scalars(
            select(DocumentChunk)
            .join(
                CurriculumDocument,
                CurriculumDocument.id == DocumentChunk.documento_malla_id,
            )
            .where(
                CurriculumDocument.programa_id == program_id,
                CurriculumDocument.estado_procesamiento
                == DocumentProcessingStatus.CONVERTIDO_A_GRAFO,
            )
            .order_by(CurriculumDocument.fecha_carga.desc(), DocumentChunk.orden),
        )
    )

    unique_candidates = list(dict.fromkeys(candidates))
    ranked = []
    for source, content in unique_candidates:
        lexical_score = _score(question, content)
        source_bonus = _source_bonus(question, source)
        ranked.append(
            RagContextItem(
                source=source,
                content=content,
                lexical_score=lexical_score,
                source_bonus=source_bonus,
                score=lexical_score + source_bonus,
            ),
        )
    ranked.sort(key=lambda item: item.score, reverse=True)
    requested_sources = _requested_source_labels(question)
    if requested_sources:
        targeted = [
            item for item in ranked if _matches_requested_source(item, requested_sources)
        ]
        targeted_with_overlap = [item for item in targeted if item.lexical_score > 0]
        selected = (targeted_with_overlap or targeted)[:limit]
    else:
        selected = [item for item in ranked if item.score > 0][:limit]
        if not selected:
            selected = ranked[:limit]

    context = "\n".join(f"- [{item.source}] {item.content}" for item in selected)
    sources = list(dict.fromkeys(item.source for item in selected))
    return context, sources
