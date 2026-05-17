from dataclasses import dataclass

from app.db.session import SessionLocal
from app.services.chat_service import generate_answer
from app.services.rag_service import build_rag_context


@dataclass(frozen=True)
class RagEvaluationCase:
    question: str
    expected_sources: tuple[str, ...]
    expected_context_snippets: tuple[str, ...]
    expected_answer_snippets: tuple[str, ...]


EVALUATION_CASES = (
    RagEvaluationCase(
        question="¿Qué dice el documento sobre programación?",
        expected_sources=("documento PDF procesado · Página 2",),
        expected_context_snippets=("Cadena de programación",),
        expected_answer_snippets=("ruta balanceada",),
    ),
    RagEvaluationCase(
        question="¿Qué escenario guardado tengo sobre redes?",
        expected_sources=("escenario guardado",),
        expected_context_snippets=("Aplazamiento de Redes",),
        expected_answer_snippets=("ruta balanceada",),
    ),
    RagEvaluationCase(
        question="¿Puedo tomar Bases de Datos?",
        expected_sources=("grafo curricular",),
        expected_context_snippets=("INF202 Bases de Datos", "Prerrequisitos: INF201"),
        expected_answer_snippets=("Aún no", "Estructuras de Datos"),
    ),
    RagEvaluationCase(
        question="¿Qué materias puedo cursar el próximo semestre?",
        expected_sources=("historial académico",),
        expected_context_snippets=("Materias disponibles próximo semestre",),
        expected_answer_snippets=("Economía para Ingenieros", "créditos disponibles"),
    ),
    RagEvaluationCase(
        question="¿Qué pasa si pierdo Programación II?",
        expected_sources=("grafo curricular",),
        expected_context_snippets=("INF102 Programación II",),
        expected_answer_snippets=("se bloquean 5 materias", "Estructuras de Datos"),
    ),
)


def test_rag_quality_regression_suite() -> None:
    with SessionLocal() as db:
        for case in EVALUATION_CASES:
            context, sources = build_rag_context(
                db,
                "student_1",
                case.question,
                program_id="prog_systems",
            )
            answer = generate_answer(db, "student_1", case.question)

            for expected_source in case.expected_sources:
                assert expected_source in sources
            for snippet in case.expected_context_snippets:
                assert snippet in context
            for snippet in case.expected_answer_snippets:
                assert snippet in answer
