from pathlib import Path

import tomllib
from store_ai_clinic.config import Settings


def test_settings_defaults(monkeypatch):
    for env_var in (
        "APP_NAME",
        "DATABASE_URL",
        "DEFAULT_TIMEZONE",
        "LOCAL_STORAGE_ROOT",
        "STREAMLIT_ENTRY",
        "API_BASE_URL",
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "OPENAI_MODEL",
        "OPENAI_VISION_MODEL",
        "OPENAI_VISION_BASE_URL",
        "OPENAI_VISION_PDF_ENABLED",
        "OPENAI_TIMEOUT_SECONDS",
    ):
        monkeypatch.delenv(env_var, raising=False)

    settings = Settings(_env_file=None)
    assert settings.app_name == "Store AI Data Clinic"
    assert settings.default_timezone == "Asia/Shanghai"
    assert settings.streamlit_entry == "streamlit_app.py"
    assert settings.local_storage_root == "data"
    assert settings.openai_api_key is None
    assert settings.openai_base_url == "https://api.deepseek.com/v1"
    assert settings.openai_model == "deepseek-chat"
    assert settings.openai_vision_base_url == "https://api.openai.com/v1"
    assert settings.openai_vision_model == "gpt-4.1-mini"
    assert settings.openai_vision_pdf_enabled is False
    assert settings.openai_timeout_seconds == 20


def test_settings_support_openai_compatible_env_overrides(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://example.com/openai-compatible")
    monkeypatch.setenv("OPENAI_MODEL", "custom-model")
    monkeypatch.setenv("OPENAI_VISION_MODEL", "custom-vision-model")
    monkeypatch.setenv("OPENAI_VISION_BASE_URL", "https://vision.example.com/v1")
    monkeypatch.setenv("OPENAI_VISION_PDF_ENABLED", "true")
    monkeypatch.setenv("OPENAI_TIMEOUT_SECONDS", "45")

    settings = Settings(_env_file=None)

    assert settings.openai_api_key == "test-key"
    assert settings.openai_base_url == "https://example.com/openai-compatible"
    assert settings.openai_model == "custom-model"
    assert settings.openai_vision_base_url == "https://vision.example.com/v1"
    assert settings.openai_vision_model == "custom-vision-model"
    assert settings.openai_vision_pdf_enabled is True
    assert settings.openai_timeout_seconds == 45


def test_settings_prefer_project_env_file_for_openai_configuration(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "stale-user-key")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://stale-user.example.com")
    monkeypatch.setenv("OPENAI_MODEL", "stale-user-model")

    env_file = Path("tests/fixtures/openai-project.env")

    settings = Settings(_env_file=env_file)

    assert settings.openai_api_key == "project-file-key"
    assert settings.openai_base_url == "https://api.deepseek.com/v1"
    assert settings.openai_model == "deepseek-chat"


def test_pyproject_supports_editable_src_layout_bootstrap():
    pyproject = tomllib.loads(Path("pyproject.toml").read_text(encoding="utf-8"))

    assert pyproject["build-system"]["build-backend"] == "setuptools.build_meta"
    assert "setuptools>=68" in pyproject["build-system"]["requires"]
    assert pyproject["tool"]["setuptools"]["package-dir"] == {"": "src"}
