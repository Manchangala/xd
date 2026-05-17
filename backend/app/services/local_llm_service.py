from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.schemas.chat import LlmConnectionResponse


@dataclass(slots=True)
class LocalGenerationResult:
    answer: str
    resolved_model: str
    provider: str


@dataclass(slots=True)
class LocalProviderProbe:
    provider: str
    base_url: str
    available_models: list[str]


def _base_url(endpoint: str) -> str:
    base_url = endpoint.strip().rstrip("/")
    if base_url.endswith("/api"):
        return base_url.removesuffix("/api")
    if base_url.endswith("/v1"):
        return base_url.removesuffix("/v1")
    return base_url


def _ollama_models(base_url: str) -> list[str]:
    response = httpx.get(f"{base_url}/api/tags", timeout=1.0)
    response.raise_for_status()
    payload = response.json()
    return [
        item.get("name") or item.get("model")
        for item in payload.get("models", [])
        if item.get("name") or item.get("model")
    ]


def _openai_compatible_models(base_url: str) -> list[str]:
    response = httpx.get(f"{base_url}/v1/models", timeout=1.0)
    response.raise_for_status()
    payload = response.json()
    models = payload.get("data", [])
    return [
        item.get("id") or item.get("name") or item.get("model")
        for item in models
        if item.get("id") or item.get("name") or item.get("model")
    ]


def _probe_provider(endpoint: str) -> LocalProviderProbe:
    base_url = _base_url(endpoint)
    provider_order = (
        ("openai_compatible", _openai_compatible_models),
        ("ollama", _ollama_models),
    ) if "/v1" in endpoint.rstrip("/") else (
        ("ollama", _ollama_models),
        ("openai_compatible", _openai_compatible_models),
    )

    errors: list[Exception] = []
    for provider, loader in provider_order:
        try:
            models = loader(base_url)
        except Exception as exc:
            errors.append(exc)
            continue
        return LocalProviderProbe(
            provider=provider,
            base_url=base_url,
            available_models=models,
        )

    raise RuntimeError("No se pudo contactar un servidor LLM compatible.") from (
        errors[-1] if errors else None
    )


def _available_models(endpoint: str) -> list[str]:
    return _probe_provider(endpoint).available_models


def _resolve_model_name(configured_model: str, available_models: list[str]) -> str | None:
    if not available_models:
        return None
    normalized_config = configured_model.strip().lower()
    if not normalized_config or normalized_config == "otro":
        return available_models[0]
    return next(
        (
            available
            for available in available_models
            if available.lower() == normalized_config
            or available.lower().startswith(normalized_config)
            or normalized_config in available.lower()
        ),
        None,
    )


def check_local_llm_connection(endpoint: str, model: str) -> LlmConnectionResponse:
    try:
        probe = _probe_provider(endpoint)
    except Exception:
        return LlmConnectionResponse(
            connected=False,
            reachable=False,
            provider=None,
            base_url=_base_url(endpoint) if endpoint else None,
            available_models=[],
            resolved_model=None,
            issues=["No se pudo contactar el endpoint configurado."],
            next_steps=[
                "Verifica que el servidor LLM local esté encendido.",
                "Para Ollama usa http://localhost:11434.",
                "Para LM Studio, llama.cpp u otro servidor compatible usa su endpoint HTTP local.",
            ],
            message="No se pudo conectar con el servidor local configurado.",
        )

    resolved_model = _resolve_model_name(model, probe.available_models)
    if model and not resolved_model:
        return LlmConnectionResponse(
            connected=False,
            reachable=True,
            provider=probe.provider,
            base_url=probe.base_url,
            available_models=probe.available_models,
            resolved_model=None,
            issues=["El servidor respondió, pero el modelo solicitado no está instalado."],
            next_steps=[
                "Instala el modelo configurado o selecciona uno disponible.",
                "Si usas un modelo no listado como Gemma/Llama/Mistral, selecciona 'Otro'.",
                "Vuelve a probar la conexión desde Configuración.",
            ],
            message="El servidor local respondió, pero el modelo configurado no está disponible.",
        )

    return LlmConnectionResponse(
        connected=True,
        reachable=True,
        provider=probe.provider,
        base_url=probe.base_url,
        available_models=probe.available_models,
        resolved_model=resolved_model,
        issues=[],
        next_steps=[],
        message=(
            "Servidor local y modelo disponibles."
            if resolved_model
            else "Servidor local disponible, pero no reportó modelos instalados."
        ),
    )


def _build_prompt(question: str, context: str) -> str:
    return (
        "Eres un asistente académico de CurriculaPath. "
        "Responde únicamente con base en el contexto recuperado. "
        "Si el contexto no basta, dilo con claridad.\n\n"
        f"Contexto recuperado:\n{context}\n\n"
        f"Pregunta del estudiante: {question}\n\n"
        "Respuesta breve y clara:"
    )


def _generate_with_ollama(
    base_url: str,
    model: str,
    question: str,
    context: str,
) -> str:
    response = httpx.post(
        f"{base_url}/api/generate",
        json={
            "model": model,
            "prompt": _build_prompt(question, context),
            "stream": False,
        },
        timeout=45.0,
    )
    response.raise_for_status()
    return response.json().get("response", "").strip()


def _generate_with_openai_compatible(
    base_url: str,
    model: str,
    question: str,
    context: str,
) -> str:
    response = httpx.post(
        f"{base_url}/v1/chat/completions",
        json={
            "model": model,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Eres un asistente académico de CurriculaPath. "
                        "Responde únicamente con base en el contexto recuperado. "
                        "Si el contexto no basta, dilo con claridad."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Contexto recuperado:\n{context}\n\n"
                        f"Pregunta del estudiante: {question}"
                    ),
                },
            ],
        },
        timeout=45.0,
    )
    response.raise_for_status()
    payload = response.json()
    choices = payload.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    return str(message.get("content") or "").strip()


def generate_with_local_llm(
    endpoint: str,
    model: str,
    question: str,
    context: str,
) -> LocalGenerationResult | None:
    try:
        probe = _probe_provider(endpoint)
        resolved_model = _resolve_model_name(model, probe.available_models)
        if not resolved_model:
            return None

        if probe.provider == "openai_compatible":
            answer = _generate_with_openai_compatible(
                probe.base_url,
                resolved_model,
                question,
                context,
            )
        else:
            answer = _generate_with_ollama(
                probe.base_url,
                resolved_model,
                question,
                context,
            )

        if not answer:
            return None
        return LocalGenerationResult(
            answer=answer,
            resolved_model=resolved_model,
            provider=probe.provider,
        )
    except Exception:
        return None
