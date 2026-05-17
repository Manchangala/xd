# Seguridad y operaci?n ? CurriculaPath

Este documento resume las protecciones operativas incorporadas al backend y qu? debe ajustarse antes de publicar el sistema fuera de una demo local.

## Protecciones ya implementadas

| ?rea | Estado |
| --- | --- |
| Autenticaci?n | JWT con expiraci?n, `iat`, `jti` y tipo de token `access` |
| Contrase?as | Hash seguro mediante `pwdlib[argon2]` |
| Usuarios inactivos | Un usuario desactivado no puede iniciar sesi?n ni seguir usando tokens previos |
| Control de acceso | Reglas por rol y pertenencia del estudiante |
| Headers de seguridad | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` |
| HTTPS | Redirecci?n y HSTS disponibles por configuraci?n |
| Hosts confiables | `TrustedHostMiddleware` configurable |
| Rate limit | Middleware local configurable por ventana de tiempo |
| Healthcheck | `/health` para estado vivo del servicio |
| Readiness | `/ready` valida conectividad b?sica con base de datos |
| Diagn?stico admin | `/api/v1/admin/system-status` consolida estado de API, base de datos, OCR, LLM, seguridad y configuraci?n |
| Validaci?n de producci?n | Si `ENVIRONMENT=production`, el backend bloquea arranque con secreto JWT d?bil, CORS abierto o HTTPS apagado |

## Variables relevantes

```env
ENVIRONMENT=production
JWT_SECRET_KEY=cambia-esto-por-un-secreto-largo-y-privado
FRONTEND_ORIGINS=https://curriculapath.tu-dominio.edu
ENFORCE_HTTPS=true
SECURE_HEADERS_ENABLED=true
TRUSTED_HOSTS=curriculapath.tu-dominio.edu,api.curriculapath.tu-dominio.edu
DOCS_ENABLED=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=120
RATE_LIMIT_WINDOW_SECONDS=60
```

## Endpoints operativos

### `GET /health`

Uso: balanceadores o verificaci?n r?pida de proceso vivo.

Respuesta:

```json
{
  "status": "ok",
  "environment": "development"
}
```

### `GET /ready`

Uso: readiness probe antes de enviar tr?fico real al backend.

Respuesta:

```json
{
  "status": "ready",
  "database": "ok"
}
```

### `GET /api/v1/admin/system-status`

Uso: panel operativo dentro de administraci?n. Requiere sesi?n con rol administrador y no reemplaza monitoreo externo, pero permite que el equipo vea r?pido si el sistema est? listo para demo o si falta configurar OCR, LLM local, seguridad o variables cr?ticas.

Respuesta abreviada:

```json
{
  "environment": "development",
  "appName": "CurriculaPath API",
  "checks": [
    {
      "id": "database",
      "nombre": "Base de datos",
      "estado": "ok",
      "detalle": "Conexi?n activa."
    }
  ]
}
```

## Recomendaciones antes de publicar

1. Usar `ENVIRONMENT=production` para activar validaciones estrictas de arranque.
2. Cambiar `JWT_SECRET_KEY`; no usar el valor de ejemplo.
3. Activar `ENFORCE_HTTPS=true` detr?s de un proxy que entregue HTTPS correctamente.
4. Definir `FRONTEND_ORIGINS` con dominios exactos, sin `*`.
5. Definir `TRUSTED_HOSTS` con el dominio real de API.
6. Desactivar documentaci?n p?blica con `DOCS_ENABLED=false` si la API queda expuesta.
7. Activar `RATE_LIMIT_ENABLED=true` en entornos compartidos.
8. Migrar de SQLite a una base persistente administrada si habr? usuarios reales concurrentes.
9. Guardar PDFs y artefactos OCR en almacenamiento durable con backups.
10. Agregar monitoreo externo, m?tricas y backups antes de operar datos reales.

## Nota sobre rate limit

El rate limit actual es intencionalmente simple y en memoria. Sirve para demo, pruebas y despliegues peque?os de una sola instancia. Para producci?n multiinstancia conviene reemplazarlo por Redis, API gateway o el mecanismo del proveedor de despliegue.

## Nota sobre HTTPS detr?s de proxy

Si se despliega detr?s de Nginx, Caddy, Traefik o un servicio administrado, el proxy debe reenviar correctamente `X-Forwarded-Proto`. En ese caso, HTTPS puede terminar en el proxy y FastAPI puede correr internamente por HTTP privado.
