from fastapi import APIRouter, HTTPException

from store_ai_clinic.schemas.batches import BatchPreviewRequest, BatchPreviewResponse
from store_ai_clinic.services.batches import parse_file_name, split_batch_files


router = APIRouter(prefix="/api/batches", tags=["batches"])


@router.post("/preview", response_model=BatchPreviewResponse)
def preview_batch(request: BatchPreviewRequest) -> BatchPreviewResponse:
    try:
        for file_name in request.files:
            parsed = parse_file_name(file_name)
            if parsed.report_type != request.diagnosis_type:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"File {file_name} report type {parsed.report_type} does not match "
                        f"requested diagnosis_type {request.diagnosis_type}"
                    ),
                )

        grouped_files = split_batch_files(request.brand_code, request.files)
        return BatchPreviewResponse(
            store_task_count=len(grouped_files),
            grouped_files=grouped_files,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
