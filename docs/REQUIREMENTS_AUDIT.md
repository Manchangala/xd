# Auditor?a de cumplimiento ? CurriculaPath

Esta revisi?n contrasta el estado actual del proyecto con el documento funcional, los diagramas, el modelo de datos y los comentarios del profesor sobre PDF/OCR/grafo y Chat con LLM local + RAG.

Conclusi?n breve: **el proyecto ya cubre el flujo principal de CurriculaPath como aplicaci?n fullstack demostrable**. La interfaz est? completa, el backend real existe, la base relacional est? modelada, el motor de simulaci?n opera sobre grafo acad?mico, el m?dulo PDF/OCR procesa documentos localmente y el Chat/RAG recupera contexto real con fallback seguro cuando no hay LLM local disponible.

## 1. Alcance funcional del documento

| Bloque solicitado | Estado | Evidencia principal |
| --- | --- | --- |
| Registro, login, logout y recuperaci?n de contrase?a | Cumplido | `/auth/register`, `/auth/login`, `/auth/recovery/*`, `/admin/users` |
| Selecci?n de uno o dos programas | Cumplido | `/perfil`, `PATCH /students/:id/programs` |
| Visualizaci?n de malla como grafo | Cumplido | `/malla`, React Flow, `GET /curriculums/:programId/graph` |
| Historial acad?mico y estados por color | Cumplido | `/perfil`, historial editable, validaci?n de prerrequisitos |
| Simulaci?n de p?rdida/cancelaci?n/aplazamiento | Cumplido | `/simulacion`, `/api/v1/simulation/*` |
| Impacto en cascada y materias bloqueadas | Cumplido | motor de simulaci?n frontend/backend |
| Rutas alternativas | Cumplido | `/rutas`, escenarios y pasos |
| Comparaci?n de escenarios | Cumplido | `/comparar`, `POST /scenarios/compare` |
| Doble programa simult?neo | Cumplido | `/doble-programa`, dos grafos y materias compartidas |
| Panel administrativo | Cumplido | `/admin`, programas, materias, versiones, dependencias y usuarios |
| Carga PDF/OCR/conversi?n a grafo | Cumplido | `/admin/cargar-pdf`, procesamiento local y aprobaci?n de grafo |
| Chat acad?mico con RAG y LLM local opcional | Cumplido | `/chat`, `/rag/retrieve`, `/llm/generate`, `/llm/connect` |
| P?gina de asesor?a acad?mica | Cumplido | `/asesor`, directorio de estudiantes y vista de apoyo |

## 2. Rutas principales

| Ruta | Estado |
| --- | --- |
| `/login` | Cumplida |
| `/registro` | Cumplida |
| `/recuperar-clave` | Cumplida |
| `/dashboard` | Cumplida |
| `/perfil` | Cumplida |
| `/malla` | Cumplida |
| `/simulacion` | Cumplida |
| `/rutas` | Cumplida |
| `/comparar` | Cumplida |
| `/doble-programa` | Cumplida |
| `/admin` | Cumplida |
| `/admin/cargar-pdf` | Cumplida |
| `/chat` | Cumplida |
| `/asesor` | Cumplida |
| `/configuracion` | Cumplida |
| `*` 404 | Cumplida |

## 3. Modelo de datos

Est?n representadas las entidades principales del modelo:

- usuarios, estudiantes y recuperaci?n de contrase?a,
- programas, inscripciones y versiones de malla,
- materias, dependencias e historial acad?mico,
- escenarios, eventos, resultados, rutas y pasos,
- documentos de malla, extracciones, chunks,
- sesiones de chat, mensajes y consultas RAG.

Archivos principales:

- `backend/app/models/entities.py`
- `backend/app/schemas/*`
- `src/types/*`

## 4. Datos y demo

| Requisito | Estado actual |
| --- | --- |
| Ingenier?a de Sistemas y Administraci?n de Empresas | Cumplido |
| 2 versiones de malla | Cumplido |
| 35?50 materias realistas | Cumplido: 42 |
| Estudiante con programa principal | Cumplido |
| Estudiante con doble programa | Cumplido |
| 3 escenarios guardados | Cumplido |
| 3 rutas alternativas | Cumplido |
| Documento PDF procesado | Cumplido |
| Conversaci?n de chat | Cumplido |

## 5. L?gica cr?tica

| Funci?n / comportamiento | Estado |
| --- | --- |
| `obtenerPrerequisitos()` | Cumplido |
| `obtenerDependientes()` | Cumplido |
| `calcularBloqueosEnCascada()` | Cumplido |
| `recalcularEstados()` | Cumplido |
| `generarRutasAlternativas()` | Cumplido |
| progreso por cr?ditos | Cumplido |
| materias disponibles por prerrequisitos aprobados | Cumplido |
| materias bloqueadas por prerrequisitos pendientes | Cumplido |
| estimaci?n de graduaci?n usando carga m?xima | Cumplido |
| comparaci?n de escenarios | Cumplido |

## 6. Requisitos visuales y UX

Cumplidos:

- sidebar por rol,
- dise?o tipo dashboard,
- grafo interactivo con colores por estado,
- filtros, b?squeda, leyenda, zoom y minimapa,
- toasts,
- tablas,
- cards,
- badges,
- paneles de detalle,
- estados vac?os y de error,
- experiencia responsive.

## 7. Backend e integraci?n

El frontend consume servicios desacoplados y puede alternar entre mocks locales y API real sin rehacer pantallas.

Servicios principales:

- `curriculumService`
- `simulationService`
- `scenarioService`
- `adminService`
- `pdfIngestionService`
- `aiChatService`

El backend ya cubre:

- autenticaci?n JWT,
- registro y recuperaci?n de contrase?a,
- administraci?n de usuarios,
- permisos por rol y pertenencia del estudiante,
- base de datos relacional y migraciones,
- motor de simulaci?n,
- PDF/OCR local,
- RAG sobre grafo, historial, escenarios y documentos,
- conexi?n opcional con LLM local.

## 8. Validaci?n automatizada

- Frontend build: `npm run build`
- Frontend lint: `npm run lint`
- Frontend unit tests: `npm run test`
- Backend tests: `python -m pytest backend/tests -q`
- Verificaci?n general: `npm run delivery:verify`

## 9. Pendientes naturales para producci?n

No bloquean la demo funcional, pero son importantes para despliegue real:

- configurar HTTPS obligatorio,
- mover secretos a variables seguras,
- definir monitoreo/observabilidad,
- endurecer pol?tica de tokens,
- elegir infraestructura final de base de datos,
- empaquetar instalador OCR si se requiere despliegue no t?cnico.

## 10. Veredicto

**CurriculaPath est? en estado fullstack demostrable y alineado con el proyecto general descrito en el documento.**
