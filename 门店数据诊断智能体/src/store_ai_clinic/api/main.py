import logging
import os

from fastapi import FastAPI

from store_ai_clinic.config import settings
from store_ai_clinic.api.routers import (
    batches,
    cards,
    conversations,
    diagnosis,
    knowledge,
    onboarding,
    quality,
    reviews,
)
from store_ai_clinic.db.session import initialize_database


logger = logging.getLogger(__name__)
app = FastAPI(title="Store AI Data Clinic API")

app.include_router(onboarding.router)
app.include_router(quality.router)
app.include_router(batches.router)
app.include_router(diagnosis.router)
app.include_router(reviews.router)
app.include_router(cards.router)
app.include_router(conversations.router)
app.include_router(knowledge.router)


def _mask_secret(value: str | None) -> dict[str, object]:
    if not value:
        return {
            "loaded": False,
            "length": 0,
            "prefix": "",
            "suffix": "",
        }

    return {
        "loaded": True,
        "length": len(value),
        "prefix": value[:8],
        "suffix": value[-4:],
    }


@app.on_event("startup")
def log_llm_configuration() -> None:
    initialize_database()
    env_api_key = _mask_secret(os.getenv("OPENAI_API_KEY"))
    settings_api_key = _mask_secret(settings.openai_api_key)

    logger.info(
        "Startup os.getenv OPENAI_API_KEY loaded=%s len=%s prefix=%s suffix=%s",
        env_api_key["loaded"],
        env_api_key["length"],
        env_api_key["prefix"],
        env_api_key["suffix"],
    )
    logger.info("Startup os.getenv OPENAI_BASE_URL=%s", os.getenv("OPENAI_BASE_URL"))
    logger.info("Startup os.getenv OPENAI_MODEL=%s", os.getenv("OPENAI_MODEL"))
    logger.info(
        "Startup resolved OPENAI_API_KEY loaded=%s len=%s prefix=%s suffix=%s",
        settings_api_key["loaded"],
        settings_api_key["length"],
        settings_api_key["prefix"],
        settings_api_key["suffix"],
    )
    logger.info("Startup resolved OPENAI_BASE_URL=%s", settings.openai_base_url)
    logger.info("Startup resolved OPENAI_MODEL=%s", settings.openai_model)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/debug/llm")
def debug_llm() -> dict[str, object]:
    key_info = _mask_secret(settings.openai_api_key)
    return {
        "model": settings.openai_model,
        "base_url": settings.openai_base_url,
        "key_loaded": key_info["loaded"],
        "key_prefix": key_info["prefix"],
        "key_length": key_info["length"],
    }
