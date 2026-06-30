from typing import Any

from pydantic import field_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict


class ProjectOpenAISettingsSource(PydanticBaseSettingsSource):
    """Prefer project-local .env values for OPENAI_* fields over stale user env vars."""

    openai_field_names = {
        "openai_api_key",
        "openai_base_url",
        "openai_model",
        "openai_vision_model",
        "openai_vision_base_url",
        "openai_vision_pdf_enabled",
        "openai_timeout_seconds",
    }

    def __init__(self, delegated_source: PydanticBaseSettingsSource):
        super().__init__(delegated_source.settings_cls)
        self.delegated_source = delegated_source

    def get_field_value(self, field: FieldInfo, field_name: str) -> tuple[Any, str, bool]:
        return None, "", False

    def __call__(self) -> dict[str, Any]:
        data = self.delegated_source()
        return {
            field_name: data[field_name]
            for field_name in self.openai_field_names
            if field_name in data and data[field_name] is not None
        }


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Store AI Data Clinic"
    database_url: str = "postgresql+psycopg://clinic:clinic@localhost:5432/clinic"
    local_storage_root: str = "data"
    default_timezone: str = "Asia/Shanghai"
    streamlit_entry: str = "streamlit_app.py"
    api_base_url: str = "http://127.0.0.1:8000"
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.deepseek.com/v1"
    openai_model: str = "deepseek-chat"
    openai_vision_base_url: str = "https://api.openai.com/v1"
    openai_vision_model: str = "gpt-4.1-mini"
    openai_vision_pdf_enabled: bool = False
    openai_timeout_seconds: int = 20

    @field_validator("openai_api_key", "openai_base_url", "openai_model", "openai_vision_base_url", "openai_vision_model", mode="before")
    @classmethod
    def _strip_optional_string(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("database_url", "local_storage_root", "default_timezone", "streamlit_entry", "api_base_url")
    @classmethod
    def _strip_required_string(cls, value: str) -> str:
        return value.strip()

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            ProjectOpenAISettingsSource(dotenv_settings),
            env_settings,
            dotenv_settings,
            file_secret_settings,
        )


settings = Settings()
