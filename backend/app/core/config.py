from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "change-me-before-production-with-at-least-32-bytes"


class Settings(BaseSettings):
    app_name: str = "CurriculaPath API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./curriculapath.db"
    jwt_secret_key: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    document_storage_dir: str = "storage/documents"
    enforce_https: bool = False
    secure_headers_enabled: bool = True
    hsts_max_age_seconds: int = 31_536_000
    trusted_hosts: str = "localhost,127.0.0.1,testserver"
    docs_enabled: bool = True
    rate_limit_enabled: bool = False
    rate_limit_requests: int = Field(default=120, ge=1)
    rate_limit_window_seconds: int = Field(default=60, ge=1)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def frontend_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        return [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    def validate_runtime_security(self) -> None:
        if not self.is_production:
            return
        problems: list[str] = []
        if self.jwt_secret_key == DEFAULT_JWT_SECRET or len(self.jwt_secret_key) < 32:
            problems.append("JWT_SECRET_KEY debe cambiarse y tener al menos 32 caracteres.")
        if "*" in self.frontend_origin_list:
            problems.append("FRONTEND_ORIGINS no debe usar '*' en producción.")
        if not self.enforce_https:
            problems.append("ENFORCE_HTTPS debe estar activo en producción.")
        if problems:
            raise RuntimeError(
                "Configuración insegura para producción: " + " ".join(problems),
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
