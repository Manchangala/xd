# Despliegue y ejecución reproducible — CurriculaPath

Esta guía deja claro cómo mover CurriculaPath entre una demo local, otra máquina del equipo y una futura publicación sin tener que tocar el código fuente.

## 1. Perfiles de uso

| Perfil | Para qué sirve | Recomendación |
| --- | --- | --- |
| Demo local | Presentaciones, sustentación y desarrollo diario | Usa SQLite, frontend Vite y `npm run dev:stack` |
| Demo en otra máquina | Mostrar el sistema fuera del equipo original | Copia los `.env`, instala dependencias y usa el mismo flujo de demo |
| Publicación controlada | Entorno estable para pruebas de usuarios | Compila frontend, protege secretos y usa una base de datos persistente |

## 2. Variables de entorno

### Frontend

Copia `.env.example` a `.env` en la raíz del proyecto cuando quieras sobrescribir valores por defecto.

```bash
cp .env.example .env
```

Variables disponibles:

| Variable | Uso |
| --- | --- |
| `VITE_API_BASE_URL` | URL base de la API real |
| `VITE_DEFAULT_DATA_SOURCE` | `api` o `mock` |
| `VITE_DEFAULT_THEME` | `light` o `dark` |
| `VITE_DEFAULT_MAX_CREDITS` | Carga máxima sugerida |
| `VITE_LLM_PROVIDER` | Proveedor visual del módulo IA |
| `VITE_LLM_MODEL` | Modelo local por defecto |
| `VITE_LLM_ENDPOINT` | Endpoint del servidor LLM local |

Los valores siguen siendo editables desde `/configuracion`; la diferencia es que ahora una instalación nueva ya puede iniciar con la configuración correcta sin intervención manual.

### Backend

Copia `backend/.env.example` a `backend/.env`.

```bash
cd backend
cp .env.example .env
```

Variables clave:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Base de datos usada por la API |
| `JWT_SECRET_KEY` | Secreto para firmar tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración de sesión |
| `FRONTEND_ORIGINS` | Orígenes permitidos por CORS |
| `DOCUMENT_STORAGE_DIR` | Carpeta de PDFs y artefactos procesados |
| `ENFORCE_HTTPS` | Redirige HTTP a HTTPS y habilita HSTS cuando est? activo |
| `SECURE_HEADERS_ENABLED` | Agrega headers de seguridad a todas las respuestas |
| `TRUSTED_HOSTS` | Hosts aceptados por la API |
| `DOCS_ENABLED` | Expone u oculta `/docs`, `/redoc` y `/openapi.json` |
| `RATE_LIMIT_ENABLED` | Activa limitaci?n b?sica de solicitudes por IP/ruta |
| `RATE_LIMIT_REQUESTS` | N?mero de solicitudes permitidas por ventana |
| `RATE_LIMIT_WINDOW_SECONDS` | Duraci?n de la ventana de rate limit |

Para una demo local, los valores del ejemplo ya sirven. Para una publicación real, cambia al menos `JWT_SECRET_KEY`, revisa `FRONTEND_ORIGINS` y usa una base de datos persistente fuera de archivos temporales.

## 3. Arranque recomendado para demo

```bash
npm install
npm run demo:prepare
npm run dev:stack
```

En otra terminal:

```bash
npm run demo:check
```

Si el chequeo termina sin errores, el frontend, la API, los accesos por rol y el diagnóstico OCR están listos para presentarse.

## 4. Arranque separado

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.db.init_db
uvicorn app.main:app --reload
```

## 5. Build de verificación

Antes de entregar o mover el proyecto a otra máquina:

```bash
npm run delivery:verify
```

Ese comando ejecuta de una sola vez build, lint, pruebas del frontend, pruebas del backend y recorridos end-to-end.

Para crear un paquete limpio de código fuente listo para compartir:

```bash
npm run delivery:bundle
```

La carpeta y el ZIP resultantes se generan dentro de `release/`, excluyendo dependencias instaladas, entornos virtuales, bases locales y archivos temporales.

Si prefieres correr cada paso por separado:

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

Y para el backend:

```bash
cd backend
pytest
```

## 6. Checklist antes de publicar

1. Cambiar secretos y no subir archivos `.env` reales.
2. Configurar `FRONTEND_ORIGINS` con los dominios exactos permitidos.
3. Sustituir SQLite por una base persistente si habrá múltiples usuarios reales.
4. Definir almacenamiento durable para PDFs y documentos procesados.
5. Verificar OCR local si se van a aceptar mallas escaneadas.
6. Confirmar que el endpoint del LLM local responda si se quiere salir del modo fallback.
7. Ejecutar toda la batería de validación antes de liberar.

## 7. Qué ya está preparado y qué falta

Ya está preparado:

- configuración separada entre frontend y backend,
- seeds reproducibles,
- reset de demo,
- preparación de demo en un solo comando,
- chequeo de salud y readiness,
- verificación completa de entrega,
- extracción PDF local,
- RAG con fallback seguro,
- headers de seguridad y validaci?n de configuraci?n productiva,
- diagnóstico operativo visible desde administración para API, base de datos, OCR, LLM, seguridad y configuración,
- pruebas unitarias y end-to-end.

Para una publicación real todavía faltaría decidir:

- proveedor de base de datos final,
- estrategia de despliegue,
- autenticación institucional o SSO si aplica,
- monitoreo, m?tricas y respaldos,
- empaquetado de OCR para usuarios no técnicos.
