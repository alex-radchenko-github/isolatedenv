"""Application settings loaded from environment variables."""

import structlog
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_log = structlog.get_logger(__name__)


class Settings(BaseSettings):
    # Database (async) — required, no default; set in .env
    DATABASE_URL: str
    # Database (sync — for Alembic & Celery) — required, no default; set in .env
    DATABASE_URL_SYNC: str

    # Authentik (OIDC / JWKS)
    AUTHENTIK_URL: str
    AUTHENTIK_CLIENT_ID: str
    AUTHENTIK_CLIENT_SECRET: str
    AUTHENTIK_API_TOKEN: str = ""  # Admin API token for user management
    JWKS_URL: str = "http://localhost:9010/application/o/isolatedenv/jwks/"
    OIDC_ISSUER: str = "http://localhost:9010/application/o/isolatedenv/"

    # Redis — required, no default; set in .env
    REDIS_URL: str
    REDIS_CACHE_URL: str
    REDIS_RESULT_URL: str

    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3010,http://localhost:5173"

    # First admin (auto-assigned role=admin on first login)
    ADMIN_EMAIL: str = ""

    # Sentry (optional)
    SENTRY_DSN: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS CSV into a clean list.

        Each origin is stripped of whitespace and trailing slashes.
        Empty entries are discarded.
        """
        origins: list[str] = []
        for raw in self.CORS_ORIGINS.split(","):
            origin = raw.strip().rstrip("/")
            if origin:
                origins.append(origin)
        return origins

    @model_validator(mode="after")
    def check_admin_token_configured(self) -> "Settings":
        if not self.AUTHENTIK_API_TOKEN and not self.DEBUG:
            _log.warning(
                "authentik_api_token_missing",
                msg="AUTHENTIK_API_TOKEN is empty and DEBUG=False — admin API calls will fail at runtime",
            )
        return self

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
