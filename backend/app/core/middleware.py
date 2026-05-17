from __future__ import annotations

from collections import defaultdict, deque
from time import monotonic
from typing import Callable

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        *,
        hsts_max_age_seconds: int,
        enforce_https: bool,
    ) -> None:
        super().__init__(app)
        self.hsts_max_age_seconds = hsts_max_age_seconds
        self.enforce_https = enforce_https

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=()",
        )
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if self.enforce_https:
            response.headers.setdefault(
                "Strict-Transport-Security",
                f"max-age={self.hsts_max_age_seconds}; includeSubDomains",
            )
        return response


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        *,
        requests: int,
        window_seconds: int,
    ) -> None:
        super().__init__(app)
        self.requests = requests
        self.window_seconds = window_seconds
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_host = request.client.host if request.client else "unknown"
        key = f"{client_host}:{request.url.path}"
        now = monotonic()
        bucket = self._hits[key]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.requests:
            return Response(
                content='{"detail":"Demasiadas solicitudes. Intenta de nuevo en unos segundos."}',
                media_type="application/json",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        bucket.append(now)
        return await call_next(request)
