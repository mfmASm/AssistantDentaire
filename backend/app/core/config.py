from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str | None = None
    supabase_storage_bucket: str = "dental-documents"
    frontend_url: str = "http://localhost:5173"
    api_port: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def FRONTEND_URL(self) -> str:
        return self.frontend_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
