from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class OnboardingStatus(BaseModel):
    status: str


class TemplatePreviewRequest(BaseModel):
    pattern: NonEmptyString


class TemplatePreviewResponse(BaseModel):
    required_tokens: list[Literal["brand_code", "store_code", "biz_date", "report_type"]]
    report_types: list[Literal["daily", "weekly"]]
    example: str
