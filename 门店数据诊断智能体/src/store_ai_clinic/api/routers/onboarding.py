from fastapi import APIRouter, HTTPException

from store_ai_clinic.schemas.onboarding import (
    TemplatePreviewRequest,
    TemplatePreviewResponse,
)
from store_ai_clinic.services.onboarding import preview_template_parse


router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/template-preview", response_model=TemplatePreviewResponse)
def template_preview(payload: TemplatePreviewRequest) -> TemplatePreviewResponse:
    try:
        return TemplatePreviewResponse.model_validate(
            preview_template_parse(payload.pattern)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
