from fastapi import APIRouter

from store_ai_clinic.schemas.reviews import ResumeReviewRequest, ResumeReviewResponse
from store_ai_clinic.services.reviews import build_resume_payload


router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("/resume", response_model=ResumeReviewResponse)
def resume_review(request: ResumeReviewRequest) -> ResumeReviewResponse:
    return ResumeReviewResponse(
        **build_resume_payload(
            task_id=request.task_id,
            resolution=request.resolution,
            remark=request.remark,
        )
    )
