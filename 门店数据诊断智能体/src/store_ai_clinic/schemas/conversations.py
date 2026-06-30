from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from store_ai_clinic.models.conversations import TITLE_SOURCE_SYSTEM, TITLE_SOURCE_USER
from store_ai_clinic.models.enums import DiagnosisType


class CreateSessionRequest(BaseModel):
    brand_id: str
    store_id: str
    entry_mode: Literal["manual", "auto_from_diagnosis"]
    initial_question: str
    diagnosis_type_hint: DiagnosisType | None = None

    @field_validator("brand_id", "store_id")
    @classmethod
    def _trim_non_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("must not be empty")
        return trimmed

    @field_validator("initial_question")
    @classmethod
    def _trim_initial_question(cls, value: str) -> str:
        return value.strip()


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    session_title: str
    title_source: Literal[TITLE_SOURCE_SYSTEM, TITLE_SOURCE_USER]
    status: Literal["active", "archived", "closed"]
    entry_mode: Literal["manual", "auto_from_diagnosis"]
    brand_id: str
    store_id: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message_id: str
    session_id: str
    role: str
    message_type: str
    content_text: str | None = None
    content_json: dict | None = None


class CitationResponse(BaseModel):
    source_id: str
    source_title: str
    knowledge_type: str
    page_no: int | None = None
    chapter_title: str | None = None
    quote_text: str
    version_label: str | None = None
