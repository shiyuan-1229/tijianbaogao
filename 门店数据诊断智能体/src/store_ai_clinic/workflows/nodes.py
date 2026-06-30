from store_ai_clinic.services.llm import DiagnosisDraft, DiagnosisLlmService, LlmServiceError
from store_ai_clinic.workflows.signals import (
    PAUSE_ACTION_HINT_REVIEW_CORRECTION,
    PAUSE_REASON_INCONSISTENT_COLUMNS,
    PAUSE_TYPE_DATA_QUALITY_REVIEW,
    PauseSignal,
)
from store_ai_clinic.workflows.state import (
    CLEAN_VALIDATE_STAGE,
    ClinicState,
    DIAGNOSE_STAGE,
    INGEST_STAGE,
)


def ingest(_: ClinicState) -> ClinicState:
    return {"graph_stage": INGEST_STAGE}


def clean_validate(state: ClinicState) -> ClinicState:
    next_state: ClinicState = {
        "graph_stage": CLEAN_VALIDATE_STAGE,
        "pause_signal": None,
    }

    if state.get("pause_at_stage") == CLEAN_VALIDATE_STAGE:
        next_state["pause_signal"] = PauseSignal(
            pause_type=PAUSE_TYPE_DATA_QUALITY_REVIEW,
            reason=PAUSE_REASON_INCONSISTENT_COLUMNS,
            action_hint=PAUSE_ACTION_HINT_REVIEW_CORRECTION,
        )

    return next_state


def _fallback_diagnosis_draft(state: ClinicState) -> DiagnosisDraft:
    return DiagnosisDraft(
        title="待人工补充诊断结论",
        summary=(
            f"任务 {state['task_id']} 已进入 {state['diagnosis_type']} 诊断阶段，"
            "当前使用系统回退摘要。"
        ),
        next_action="补充门店关键指标后重新触发模型诊断。",
    )


def diagnose(
    state: ClinicState,
    *,
    diagnosis_service: DiagnosisLlmService | None = None,
) -> ClinicState:
    service = diagnosis_service or DiagnosisLlmService.from_settings()

    try:
        diagnosis_draft = service.generate_diagnosis_draft(
            task_id=state["task_id"],
            store_id=state["store_id"],
            diagnosis_type=state["diagnosis_type"],
            context=state.get("diagnosis_context"),
        )
    except (LlmServiceError, RuntimeError) as exc:
        return {
            "graph_stage": DIAGNOSE_STAGE,
            "diagnosis_source": "fallback",
            "diagnosis_error": str(exc),
            "diagnosis_draft": _fallback_diagnosis_draft(state),
        }

    return {
        "graph_stage": DIAGNOSE_STAGE,
        "diagnosis_source": "llm",
        "diagnosis_error": None,
        "diagnosis_draft": diagnosis_draft,
    }
