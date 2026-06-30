from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class DiagnosisDraftResponse(BaseModel):
    title: NonEmptyString
    summary: NonEmptyString
    next_action: NonEmptyString


class DiagnosisRunRequest(BaseModel):
    task_id: NonEmptyString
    store_id: NonEmptyString
    diagnosis_type: Literal["daily", "weekly"]
    context: NonEmptyString


class DiagnosisRunResponse(BaseModel):
    task_id: NonEmptyString
    store_id: NonEmptyString
    diagnosis_type: Literal["daily", "weekly"]
    graph_stage: str
    diagnosis_source: str | None
    diagnosis_error: str | None
    diagnosis_draft: DiagnosisDraftResponse
