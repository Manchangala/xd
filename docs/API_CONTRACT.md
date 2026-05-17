# API Contract — CurriculaPath

Este contrato documenta la interfaz estable entre frontend y backend para conservar los componentes desacoplados y permitir alternar entre mocks locales y API real.


## Operaci?n

### `GET /health`

Respuesta:
```json
{
  "status": "ok",
  "environment": "development"
}
```

### `GET /ready`

Respuesta:
```json
{
  "status": "ready",
  "database": "ok"
}
```

Estos endpoints no reemplazan autenticaci?n ni autorizaci?n; sirven para liveness/readiness del servicio.

## Auth

### `POST /auth/login`

**Request**
```json
{
  "email": "estudiante@curriculapath.edu",
  "password": "demo123"
}
```

**Response**
```json
{
  "accessToken": "jwt-token",
  "tokenType": "bearer",
  "studentId": "student_1",
  "user": {
    "id": "user_student",
    "nombre": "Gabriel Jiménez",
    "email": "estudiante@curriculapath.edu",
    "rol": "student"
  }
}
```

### `POST /auth/register`

**Request**
```json
{
  "nombre": "Nuevo Estudiante",
  "email": "nuevo@curriculapath.edu",
  "password": "demo123",
  "codigoEstudiantil": "202699001",
  "semestreActual": 1,
  "cargaMaximaCreditos": 20,
  "programaPrincipalId": "prog_systems",
  "programaSecundarioId": "prog_business"
}
```

**Response**
```json
{
  "accessToken": "jwt-token",
  "tokenType": "bearer",
  "studentId": "student_123",
  "user": {
    "id": "user_123",
    "nombre": "Nuevo Estudiante",
    "email": "nuevo@curriculapath.edu",
    "rol": "student",
    "activo": true
  }
}
```

### `POST /auth/recovery/request`

**Request**
```json
{
  "email": "estudiante@curriculapath.edu"
}
```

**Response demo/desarrollo**
```json
{
  "message": "C?digo de recuperaci?n generado. En producci?n se enviar?a por email.",
  "demoCode": "codigo-visible-solo-demo"
}
```

### `POST /auth/recovery/confirm`

**Request**
```json
{
  "email": "estudiante@curriculapath.edu",
  "code": "codigo-visible-solo-demo",
  "newPassword": "nueva123"
}
```

### `POST /auth/logout`
### `GET /auth/me`

## Programas

- `GET /programs`
- `GET /programs/:id`
- `POST /programs` *(admin)*
- `PATCH /programs/:id` *(admin)*

## Materias

- `GET /curriculums/:programId/courses`
- `GET /courses/:id`
- `POST /courses` *(admin)*
- `PATCH /courses/:id` *(admin)*

## Grafo

### `GET /curriculums/:programId/graph`

**Response**
```json
{
  "programa": {
    "id": "prog_systems",
    "nombre": "Ingeniería de Sistemas"
  },
  "materias": [
    {
      "id": "sys_inf101",
      "codigo": "INF101",
      "nombre": "Programación I",
      "estado": "aprobada"
    }
  ],
  "dependencias": [
    {
      "materiaId": "sys_inf102",
      "materiaRequeridaId": "sys_inf101",
      "tipo": "prerequisito"
    }
  ]
}
```

## Historial

- `GET /students` *(advisor/admin)*
- `GET /students/:id/profile`
- `PATCH /students/:id`
- `PATCH /students/:id/programs`
- `GET /students/:id/history`
- `PATCH /students/:id/history/:courseId`
- `GET /students/:id/progress/:programId`

**Request ejemplo para historial**
```json
{
  "estado": "aprobada"
}
```

**Request ejemplo para programas del estudiante**
```json
{
  "programaPrincipalId": "prog_systems",
  "programaSecundarioId": "prog_business"
}
```

**Response ejemplo de progreso**
```json
{
  "totalCreditos": 162,
  "creditosAprobados": 42,
  "porcentajeAvance": 25.9,
  "semestreEstimadoGraduacion": 12,
  "semestresRestantesEstimados": 6,
  "cargaMaximaCreditos": 20
}
```

## Simulación

- `POST /simulation/failure`
- `POST /simulation/cancellation`
- `POST /simulation/postponement`

**Request**
```json
{
  "studentId": "student_1",
  "courseId": "sys_inf102"
}
```

**Response**
```json
{
  "materiasBloqueadas": ["sys_inf201", "sys_inf202"],
  "impactoCreditos": 8,
  "semestreEstimadoAntes": 9,
  "semestreEstimadoDespues": 10,
  "rutas": [
    {
      "nombre": "Ruta balanceada",
      "semestreEstimadoGraduacion": 10
    }
  ]
}
```

## Escenarios

- `GET /students/:id/scenarios`
- `POST /scenarios`
- `GET /scenarios/:id`
- `POST /scenarios/compare`

## Doble programa

- `GET /students/:id/double-program`

## Administración

- `GET /admin/overview`
- `GET /admin/dashboard`
- `GET /admin/system-status`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/reset-password`
- `POST /admin/versions`
- `PATCH /admin/versions/:id`
- `POST /admin/versions/:id/toggle`
- `POST /admin/dependencies`
- `DELETE /admin/dependencies/:id`

`/admin/dashboard` devuelve también la actividad administrativa reciente persistida. Las mutaciones validan permisos de administrador, códigos duplicados, existencia de versiones, dependencias cruzadas entre versiones y ciclos de prerrequisitos.

### `GET /admin/system-status`

Devuelve un diagnóstico operativo consolidado para el panel de administración. Requiere rol administrador.

**Response**
```json
{
  "environment": "development",
  "appName": "CurriculaPath API",
  "checks": [
    {
      "id": "api",
      "nombre": "API REST",
      "estado": "ok",
      "detalle": "Servicio disponible y autenticación activa.",
      "accionRecomendada": null
    },
    {
      "id": "ocr",
      "nombre": "OCR local",
      "estado": "warning",
      "detalle": "OCR no instalado; los PDFs con texto nativo siguen funcionando.",
      "accionRecomendada": "Instalar Tesseract si se procesarán mallas escaneadas."
    }
  ]
}
```

Estados posibles por chequeo: `ok`, `warning`, `error`. Los identificadores actuales son `api`, `database`, `ocr`, `llm`, `security` y `configuration`.

## PDF / OCR

- `POST /admin/curriculum-documents/upload`
- `POST /admin/curriculum-documents/:id/process`
- `GET /admin/curriculum-documents/:id/status`
- `GET /admin/curriculum-documents/:id/extraction`
- `POST /admin/curriculum-documents/:id/approve-graph`
- `GET /admin/ocr/status`


**Upload request**

`multipart/form-data`

- `file`: PDF, JPG, JPEG, PNG o WebP.
- `program_id`: identificador del programa.

Si el archivo es imagen o PDF escaneado, el backend lo procesa por el camino OCR. Si no hay OCR local disponible, debe responder con diagnóstico claro y bloquear el guardado automático del grafo hasta revisión manual.

**Upload response**
```json
{
  "id": "doc_123",
  "programaId": "prog_systems",
  "estadoProcesamiento": "pendiente",
  "porcentajeProgreso": 0
}
```

**Extraction response**
```json
{
  "textoExtraido": "MAT101 Cálculo Diferencial...",
  "metodoExtraccion": "texto_pdf",
  "confianzaOcr": 0.99
}
```

**Process response**
```json
{
  "document": {
    "id": "doc_123",
    "estadoProcesamiento": "validando",
    "porcentajeProgreso": 85
  },
  "extraction": {
    "textoExtraido": "INF101 Programación I...",
    "metodoExtraccion": "texto_pdf",
    "confianzaOcr": 0.99
  },
  "courses": [],
  "dependencies": [],
  "diagnostics": {
    "pageCount": 1,
    "pagesWithNativeText": 1,
    "pagesUsingOcr": 0,
    "pagesWithoutText": 0,
    "scannedLike": false,
    "ocrAvailable": false,
    "ocrLanguageUsed": null,
    "canRetryWithOcr": false,
    "recommendedAction": "review",
    "message": "Se extrajo texto del archivo. Revisa las materias y dependencias antes de guardar."
  }
}
```

**Approve graph request**
```json
{
  "versionId": "ver_sys_2025",
  "courses": [
    {
      "codigo": "INF101",
      "nombre": "Programación I",
      "creditos": 4,
      "semestre": 1,
      "confianza": 0.99
    }
  ],
  "dependencies": [
    {
      "materia": "INF102",
      "requiere": "INF101",
      "tipo": "prerequisito",
      "confianza": 0.98
    }
  ]
}
```

**Approve graph response**
```json
{
  "documentId": "doc_123",
  "approved": true,
  "createdCourses": 1,
  "updatedCourses": 0,
  "createdDependencies": 1
}
```

La aprobación del grafo valida materias sin código, códigos duplicados, dependencias con materias no reconocidas, autorreferencias y ciclos de prerrequisitos antes de persistir cambios.

Cuando `recommendedAction` sea `install_ocr_and_retry`, el frontend puede volver a invocar `POST /admin/curriculum-documents/:id/process` sobre el mismo documento después de que el administrador configure OCR local.

## Chat / RAG

- `POST /chat/sessions`
- `GET /chat/sessions`
- `GET /chat/sessions/:id/messages`
- `GET /chat/sessions/:id/rag-queries`
- `POST /chat/sessions/:id/messages`
- `POST /rag/retrieve`
- `POST /llm/generate`
- `POST /llm/connect`

**Mensaje**
```json
{
  "mensaje": "¿Qué materias puedo cursar el próximo semestre?",
  "endpoint": "http://localhost:11434",
  "model": "gemma"
}
```

**Respuesta**
```json
{
  "respuesta": "Puedes cursar Estructuras de Datos y Redes de Computadores.",
  "fuentes": ["grafo curricular", "historial académico"],
  "modeloLocal": "gemma",
  "generationMode": "local_llm"
}
```

La recuperación RAG limita los chunks documentales al programa consultado y a documentos que ya fueron convertidos a grafo.

### `POST /llm/connect`

**Request**
```json
{
  "endpoint": "http://localhost:11434",
  "model": "gemma"
}
```

**Response**
```json
{
  "connected": false,
  "reachable": true,
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "availableModels": ["llama3.2:latest"],
  "resolvedModel": null,
  "issues": ["El servidor respondió, pero el modelo solicitado no está instalado."],
  "nextSteps": [
    "Instala el modelo configurado o selecciona uno disponible.",
    "Vuelve a probar la conexión desde Configuración."
  ],
  "message": "El servidor local respondió, pero el modelo configurado no está disponible."
}
```

El backend detecta servidores **Ollama** (`/api/tags`, `/api/generate`) y servidores locales **OpenAI compatibles** como LM Studio o llama.cpp (`/v1/models`, `/v1/chat/completions`). Si el modelo configurado es `otro`, usa el primer modelo disponible reportado por el servidor local.

## Notas de integración

1. Los componentes consumen servicios (`curriculumService`, `simulationService`, `pdfIngestionService`, `aiChatService`).
2. Los servicios del frontend ya encapsulan la elección entre `mockAdapter/localStorage` y cliente HTTP real.
3. El frontend asume respuestas asíncronas, estados de carga y errores.
4. El backend usa el prefijo `/api/v1`; el cliente frontend debe aplicarlo mediante configuración, no quemarlo dentro de cada componente.
5. Las rutas con información académica de estudiante requieren autenticación y aplican control de acceso por rol/pertenencia.
