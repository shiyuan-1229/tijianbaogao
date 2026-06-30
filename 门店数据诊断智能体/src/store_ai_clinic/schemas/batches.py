from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class BatchPreviewRequest(BaseModel):
    brand_code: NonEmptyString
    diagnosis_type: Literal["daily", "weekly"]
    files: Annotated[list[NonEmptyString], Field(min_length=1)]


class BatchPreviewResponse(BaseModel):
    store_task_count: int
    grouped_files: dict[str, list[str]]
