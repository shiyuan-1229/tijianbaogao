from typing import Annotated

from pydantic import BaseModel, StringConstraints

from store_ai_clinic.models.enums import ReviewResolution


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ReviewStatus(BaseModel):
    status: str


class ResumeReviewRequest(BaseModel):
    task_id: NonEmptyString
    resolution: ReviewResolution
    remark: NonEmptyString


class ResumeReviewResponse(BaseModel):
    task_id: NonEmptyString
    resolution: ReviewResolution
    remark: NonEmptyString
    resume_from_checkpoint: bool
