# CurriculaPath API

Backend funcional de CurriculaPath para la segunda fase del proyecto.

## Stack

- FastAPI
- SQLAlchemy 2
- SQLite en desarrollo local por defecto
- Alembic preparado para migraciones
- JWT para autenticación

## Ejecución local

```bash
cd backend
copy .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.db.init_db
uvicorn app.main:app --reload
```

La API quedará disponible en `http://127.0.0.1:8000`.

## Credenciales seed

- `estudiante@curriculapath.edu` / `demo123`
- `admin@curriculapath.edu` / `demo123`
- `asesor@curriculapath.edu` / `demo123`

## Estado actual

Este primer bloque ya cubre:

- autenticación JWT,
- catálogo de programas y materias,
- grafo curricular,
- historial académico,
- permisos reales por rol y por estudiante sobre la información académica,
- doble programa,
- simulación académica,
- escenarios guardados y comparación,
- administración real con permisos, validaciones y actividad persistida,
- extracción local real de PDF, revisión y persistencia del grafo,
- validación estricta al aprobar grafos extraídos desde PDF,
- diagnóstico guiado de disponibilidad OCR local, incluyendo idioma español, problemas detectados y próximos pasos,
- diagnóstico por documento procesado y reintento de OCR sin volver a subir el archivo,
- recuperación RAG real sobre datos persistidos,
- recuperación documental filtrada por programa y por documentos ya aprobados,
- respuestas académicas deterministas basadas en estado real y simulación,
- selección automática del programa principal del estudiante para chat y recuperación,
- conector opcional para generación con LLM local y fallback seguro cuando el servidor no está disponible.
- directorio real de estudiantes para asesoría.

Para PDFs escaneados, el pipeline ya detecta el caso y puede usar OCR local si Tesseract está instalado en el equipo. El endpoint de diagnóstico informa si falta el motor, si falta el idioma español y qué debe corregirse antes de procesar imágenes. Si OCR no estaba listo en el primer intento, el mismo documento puede reprocesarse luego de corregir la configuración sin necesidad de volver a subirlo. La siguiente iteración puede automatizar la instalación asistida y refinar la calidad de recuperación/generación.

Para una instalación reproducible fuera del equipo de desarrollo, consulta `../docs/DEPLOYMENT.md`.

Para trabajar el esquema de forma segura y repetible, consulta `../docs/MIGRATIONS.md`.
