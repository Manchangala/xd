# Evaluación base del módulo Chat / RAG

El módulo ya cuenta con una batería pequeña de regresión para evitar que futuras mejoras rompan respuestas académicas que hoy sí funcionan.

## Qué se valida

| Pregunta | Qué debe recuperar | Qué debe responder |
| --- | --- | --- |
| ¿Qué dice el documento sobre programación? | Fragmento correcto del PDF procesado | Respuesta estable del asistente |
| ¿Qué escenario guardado tengo sobre redes? | Escenario relacionado con Redes | Respuesta estable del asistente |
| ¿Puedo tomar Bases de Datos? | Nodo y prerrequisito real de la materia | Que aún falta aprobar Estructuras de Datos |
| ¿Qué materias puedo cursar el próximo semestre? | Historial académico y materias disponibles | Lista de materias y créditos disponibles |
| ¿Qué pasa si pierdo Programación II? | Nodo de la materia en el grafo | Bloqueos en cascada y efecto académico |

## Decisión de calidad incorporada

Cuando la pregunta menciona explícitamente una fuente —por ejemplo **documento**, **historial**, **escenario** o **grafo**— el recuperador ya no trae indiscriminadamente cualquier bloque de esa fuente. Si existe contenido con coincidencia léxica real dentro de la fuente solicitada, prioriza solo ese material.

Esto evita, por ejemplo:

- devolver páginas del PDF que no hablan del tema preguntado,
- listar escenarios no relacionados cuando sí existe uno pertinente,
- mezclar contexto lateral que solo coincide por tipo de fuente.

## Conexión con LLM local

El conector local ya no queda amarrado a un único wrapper. La API detecta:

- Ollama mediante `/api/tags` y `/api/generate`.
- LM Studio, llama.cpp u otros servidores locales compatibles con OpenAI mediante `/v1/models` y `/v1/chat/completions`.

Si el modelo configurado es `gemma`, `llama` o `mistral`, CurriculaPath intenta resolverlo contra el nombre real reportado por el servidor, por ejemplo `gemma3:latest` o `google/gemma-3-4b`. Si el usuario selecciona `otro`, usa el primer modelo disponible para no bloquear pruebas locales.

## Cómo ejecutarlo

```bash
cd backend
pytest tests/test_rag_quality.py
```

La prueba completa del backend también lo cubre:

```bash
pytest
```

## Qué no mide todavía

Esta batería protege comportamiento determinista y recuperación básica. Aún no mide:

- calidad semántica avanzada,
- respuestas generadas por un LLM real,
- relevancia con embeddings,
- precisión comparada entre varios modelos locales.

Esas capas quedarían para una evaluación más madura cuando se conecte el modelo local definitivo.
