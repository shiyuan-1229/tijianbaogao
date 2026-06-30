from fastapi import APIRouter

from store_ai_clinic.schemas.diagnosis import DiagnosisRunRequest, DiagnosisRunResponse
from store_ai_clinic.services.diagnosis import run_diagnosis_task


router = APIRouter(prefix="/api/diagnosis", tags=["diagnosis"])


@router.post("/run", response_model=DiagnosisRunResponse)
def run_diagnosis(request: DiagnosisRunRequest) -> DiagnosisRunResponse:
    return DiagnosisRunResponse.model_validate(
        run_diagnosis_task(
            task_id=request.task_id,
            store_id=request.store_id,
            diagnosis_type=request.diagnosis_type,
            context=request.context,
        )
    )
