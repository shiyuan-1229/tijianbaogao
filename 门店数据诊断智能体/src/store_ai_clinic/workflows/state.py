from typing import NotRequired, Required, TypedDict

from store_ai_clinic.services.llm import DiagnosisDraft
from store_ai_clinic.workflows.signals import PauseSignal

CLEAN_VALIDATE_STAGE = "clean_validate"
DIAGNOSE_STAGE = "diagnose"
INGEST_STAGE = "ingest"


class ClinicState(TypedDict):
    task_id: Required[str]
    store_id: Required[str]
    diagnosis_type: Required[str]
    graph_stage: NotRequired[str]
    diagnosis_context: NotRequired[str | None]
    diagnosis_draft: NotRequired[DiagnosisDraft | None]
    diagnosis_source: NotRequired[str | None]
    diagnosis_error: NotRequired[str | None]
    pause_at_stage: NotRequired[str | None]
    pause_signal: NotRequired[PauseSignal | None]
