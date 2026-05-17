# CurriculaPath — Simulador Dinámico de Malla Curricular

**CurriculaPath** es una aplicación web fullstack para visualizar mallas curriculares como grafos, simular decisiones académicas y apoyar la planeación del estudiante.

El proyecto actual integra frontend profesional, API real, autenticación, persistencia relacional, motor de simulación, extracción PDF/OCR, recuperación RAG y conexión opcional con LLM local.

## Stack

- React + TypeScript + Vite
- React Router
- Tailwind CSS
- React Flow
- Zustand
- TanStack Query
- React Hook Form + Zod
- Recharts
- localStorage para persistencia mock
- Vitest
- Playwright para recorridos end-to-end

## Cómo instalar y ejecutar

```bash
npm install
npm run dev
```

Luego abre la URL que imprima Vite.

Si ya configuraste también el backend, puedes levantar ambos lados juntos con:

```bash
npm run dev:stack
```

En Windows también puedes usar directamente:

- `REVISAR_ENTORNO.cmd`
- `INICIAR_DEMO.cmd`
- `VERIFICAR_DEMO.cmd`
- `ENTREGA_LISTA.cmd`
- `EMPAQUETAR_ENTREGA.cmd`

La guía corta para Windows está en `docs/WINDOWS_QUICKSTART.md`.

El manual completo para montar el proyecto en otro PC y ejecutar pruebas está en `docs/MANUAL_INSTALACION_PRUEBAS.md`.

Si necesitas mover el proyecto a otra máquina o dejar valores por defecto distintos, copia `.env.example` a `.env` en la raíz del proyecto y `backend/.env.example` a `backend/.env`. La guía completa está en `docs/DEPLOYMENT.md`.

Para preparar una demo limpia:

```bash
npm run demo:prepare
npm run dev:stack
npm run demo:check
```

## Backend real en desarrollo

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.db.init_db
uvicorn app.main:app --reload
```

La API queda disponible en `http://127.0.0.1:8000` y el contrato base vive en `docs/API_CONTRACT.md`.

Estado actual del backend:

- autenticación JWT,
- registro de estudiantes, recuperación de contraseña y gestión administrativa de usuarios,
- programas y materias,
- grafo curricular,
- historial académico con validación de prerrequisitos,
- permisos reales sobre datos académicos por rol y por estudiante,
- resumen de progreso,
- doble programa,
- simulación de pérdida/cancelación/aplazamiento,
- escenarios guardados y comparación,
- administración real con permisos, validaciones y trazabilidad de cambios,
- diagnóstico operativo para administradores con estado de API, base de datos, OCR, LLM, seguridad y configuración,
- extracción local real de PDF con revisión y persistencia del grafo,
- recuperación RAG real sobre grafo, historial, escenarios y chunks de documentos,
- conector opcional para LLM local con fallback seguro a generación simulada cuando no haya servidor disponible,
- directorio real de estudiantes para la vista de asesoría.

### Nota para Windows

- En **PowerShell**, si la política de ejecución bloquea `npm.ps1`, usa `npm.cmd install` y `npm.cmd run dev`.
- En **Git Bash**, las rutas de Windows se escriben como `/c/Users/...` y deben ir entre comillas si contienen espacios.

## Credenciales mock

| Rol | Email | Contraseña |
| --- | --- | --- |
| Estudiante | `estudiante@curriculapath.edu` | `demo123` |
| Administrador | `admin@curriculapath.edu` | `demo123` |
| Asesor | `asesor@curriculapath.edu` | `demo123` |

## Rutas principales

- `/login`
- `/registro`
- `/recuperar-clave`
- `/dashboard`
- `/perfil`
- `/malla`
- `/simulacion`
- `/rutas`
- `/comparar`
- `/doble-programa`
- `/admin`
- `/admin/cargar-pdf`
- `/chat`
- `/asesor`
- `/configuracion`

## Arquitectura frontend

La aplicación separa:

- `src/components`: layout, UI reusable, cards y grafo
- `src/features`: módulos por dominio
- `src/lib`: utilidades, storage y contrato de cliente API
- `src/mocks`: datos semilla realistas
- `src/types`: interfaces TypeScript del dominio
- `src/tests`: pruebas unitarias de lógica crítica
- `e2e`: recorridos reales de estudiante, administrador y asesor

La UI no consume datos pegados directamente. Las páginas llaman servicios desacoplados:

- `curriculumService`
- `simulationService`
- `scenarioService`
- `adminService`
- `pdfIngestionService`
- `aiChatService`

Además, las rutas se cargan de forma diferida y se protegen visualmente por rol para mantener coherencia entre navegación, permisos y futuras reglas de backend.

El panel `/admin` incluye una pestaña de estado del sistema que consume `adminService.getSystemStatus()`. En modo mock muestra diagnósticos simulados; en modo API consulta `/api/v1/admin/system-status` para revisar salud operativa antes de una demo o publicación.

## Qué está mockeado

- Login por rol
- Historial académico
- Programas, materias, versiones y dependencias
- Simulación de pérdida/cancelación/aplazamiento
- Escenarios guardados y rutas alternativas
- OCR de PDFs escaneados cuando no exista motor local instalado
- Chat académico con RAG y Gemma local

Los mocks persisten temporalmente en `localStorage`.

## Cómo alternar mocks y API real

1. Cambia la fuente de datos desde `/configuracion` o mediante `VITE_DEFAULT_DATA_SOURCE`.
2. Los componentes se mantienen igual: consumen servicios desacoplados.
3. En modo `mock`, los servicios usan `localStorage`.
4. En modo `api`, los servicios usan `src/lib/api/apiClient.ts` contra el backend con prefijo `/api/v1`.
5. El contrato vivo est? en `docs/API_CONTRACT.md`.

## Módulo PDF / OCR

La pantalla `/admin/cargar-pdf` incluye:

- Drag & drop
- Validación de PDF
- Selector de programa y versión
- Pipeline visual
- Extracción real de texto PDF local
- Tablas de materias y dependencias detectadas
- Vista previa de grafo
- Corrección manual antes de aprobar
- Persistencia real de materias y dependencias en la versión de malla seleccionada
- Validación backend de códigos duplicados, dependencias inválidas y ciclos antes de guardar
- Diagnóstico visible de disponibilidad OCR local con problemas detectados y próximos pasos
- Diagnóstico por documento procesado: páginas con texto nativo, páginas leídas por OCR y páginas sin texto
- Reintento de OCR sobre el mismo archivo cuando el documento parece escaneado y el motor local aún no estaba disponible
- Estados de error previstos

Cuando un PDF viene escaneado como imagen, el backend deja listo el flujo para OCR local. Si Tesseract está instalado en el equipo, PyMuPDF puede usarlo; si no, el documento queda marcado para revisión/error sin depender de servicios cloud.

Si primero procesas un PDF escaneado sin tener OCR listo, no hace falta volver a subirlo: instala o configura OCR, pulsa **Actualizar diagnóstico** y luego **Reintentar OCR** sobre el mismo documento.

La guía práctica para habilitar OCR local en Windows está en `docs/OCR_WINDOWS.md`.

Si el equipo solo tiene inglés instalado para OCR, el backend puede degradar de forma segura y usar ese idioma; para mallas en español, `spa` sigue siendo la configuración recomendada.

Los PDFs de prueba controlados se generan con `npm run demo:pdfs` y quedan en `docs/demo-assets/`.

## Módulo Chat / RAG

La pantalla `/chat` incluye:

- Conversaciones
- Preguntas rápidas
- Respuestas fundamentadas en datos académicos
- Recuperación real de contexto desde grafo, historial, escenarios y documentos
- Recuperación documental acotada al programa correcto y a PDFs ya convertidos a grafo
- Respuestas mock apoyadas en estado real de materias y en el motor de simulación
- Resolución automática del programa principal del estudiante para respuestas y contexto
- Panel de contexto recuperado
- Fuentes trazables
- Estado del modelo local y prueba de conexión
- Pipeline RAG

La prueba de conexión del LLM local ahora distingue entre servidor no disponible, servidor visible sin el modelo pedido y modelo listo para usarse. Soporta Ollama y servidores locales compatibles con OpenAI, como LM Studio o llama.cpp. Si se elige `Otro`, CurriculaPath usa el primer modelo local disponible.

La batería de evaluación mínima del módulo está documentada en `docs/RAG_EVALUATION.md`.

## Guía de demo

Para presentar el proyecto de forma ordenada, usa `docs/DEMO_GUIDE.md`.

Para instalarlo o moverlo entre equipos sin tocar el código, usa `docs/DEPLOYMENT.md`.

Si trabajas desde Windows y quieres evitar problemas con PowerShell o rutas de Git Bash, usa `docs/WINDOWS_QUICKSTART.md`.

Para revisar qué comportamiento del Chat/RAG ya queda protegido por pruebas, usa `docs/RAG_EVALUATION.md`.

Para revisar la estrategia de esquema y migraciones del backend, usa `docs/MIGRATIONS.md`.

Para revisar seguridad operativa y publicaci?n controlada, usa `docs/SECURITY_AND_OPERATIONS.md`.

Para revisar el estado completo antes de enviar o sustentar, usa `docs/DELIVERY_CHECKLIST.md`.

Para ver la auditoría directa contra los requisitos del documento y los comentarios del profesor, usa `docs/REQUIREMENTS_AUDIT.md`.

Para preparar la explicación oral y responder preguntas del profesor, usa `docs/SUSTENTACION.md`.

Para instalarlo desde cero y saber exactamente qué pruebas correr, usa `docs/MANUAL_INSTALACION_PRUEBAS.md`.

## Scripts

```bash
npm run dev
npm run dev:stack
npm run doctor
npm run demo:prepare
npm run demo:reset
npm run demo:pdfs
npm run demo:check
npm run delivery:verify
npm run delivery:bundle
npm run build
npm run lint
npm run test
npm run test:e2e
```

`npm run doctor` es el chequeo rápido recomendado cuando algo no abre: revisa estructura del proyecto, dependencias, entorno backend, OCR local, PDFs de demo y puertos usados.

## Próximos pasos

1. Afinar prompts, ranking de recuperación y evaluación del módulo Chat/RAG.
2. Definir la estrategia de despliegue estable y la base persistente final.
3. Añadir un instalador asistido de OCR si se decide soportar despliegue no técnico.
