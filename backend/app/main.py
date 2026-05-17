from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import get_settings
from app.core.middleware import InMemoryRateLimitMiddleware, SecurityHeadersMiddleware
from app.db.init_db import init_db
from app.db.session import SessionLocal

settings = get_settings()
settings.validate_runtime_security()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)
if settings.trusted_host_list:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list)
if settings.enforce_https:
    app.add_middleware(HTTPSRedirectMiddleware)
if settings.rate_limit_enabled:
    app.add_middleware(
        InMemoryRateLimitMiddleware,
        requests=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )
if settings.secure_headers_enabled:
    app.add_middleware(
        SecurityHeadersMiddleware,
        hsts_max_age_seconds=settings.hsts_max_age_seconds,
        enforce_https=settings.enforce_https,
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@app.get("/ready")
def ready() -> dict[str, str]:
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ready", "database": "ok"}
