from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Strava
    strava_client_id: str = "216298"
    strava_client_secret: str = ""

    # Anthropic Claude
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-5"

    # Infra
    database_url: str = "postgresql+asyncpg://vincere:vincere@localhost:5432/vincere"
    redis_url: str = "redis://localhost:6379/0"

    # Security
    jwt_secret: str = "change-me-in-production"
    cors_origins: str = "*"


settings = Settings()
