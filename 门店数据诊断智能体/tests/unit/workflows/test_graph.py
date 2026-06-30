from store_ai_clinic.workflows.graph import build_graph
from store_ai_clinic.workflows.signals import (
    PAUSE_REASON_INCONSISTENT_COLUMNS,
    PAUSE_TYPE_DATA_QUALITY_REVIEW,
    PAUSE_ACTION_HINT_REVIEW_CORRECTION,
    PauseSignal,
)
from store_ai_clinic.workflows.state import CLEAN_VALIDATE_STAGE, ClinicState, DIAGNOSE_STAGE


def test_graph_pauses_at_clean_validate_with_full_data_quality_signal_payload():
    graph = build_graph()

    result = graph.invoke(
        ClinicState(
            task_id="task-001",
            store_id="store-001",
            diagnosis_type="daily",
            pause_at_stage=CLEAN_VALIDATE_STAGE,
        )
    )

    assert result["graph_stage"] == CLEAN_VALIDATE_STAGE
    assert result["pause_signal"] == PauseSignal(
        pause_type=PAUSE_TYPE_DATA_QUALITY_REVIEW,
        reason=PAUSE_REASON_INCONSISTENT_COLUMNS,
        action_hint=PAUSE_ACTION_HINT_REVIEW_CORRECTION,
    )


def test_graph_clears_stale_pause_signal_on_non_pause_path():
    class DummyDiagnosisService:
        def generate_diagnosis_draft(self, **kwargs):
            return {
                "title": "库存周转偏低",
                "summary": "近 7 日库存周转率低于阈值。",
                "next_action": "优先复核补货节奏。",
            }

    graph = build_graph(diagnosis_service=DummyDiagnosisService())

    result = graph.invoke(
        ClinicState(
            task_id="task-002",
            store_id="store-002",
            diagnosis_type="daily",
            pause_at_stage="ingest",
            diagnosis_context="库存周转率 2.1，品牌阈值 3.0。",
            pause_signal=PauseSignal(
                pause_type=PAUSE_TYPE_DATA_QUALITY_REVIEW,
                reason="stale reason",
                action_hint="stale action",
            ),
        )
    )

    assert result["graph_stage"] == DIAGNOSE_STAGE
    assert result["pause_signal"] is None
    assert result["diagnosis_source"] == "llm"
    assert result["diagnosis_draft"] == {
        "title": "库存周转偏低",
        "summary": "近 7 日库存周转率低于阈值。",
        "next_action": "优先复核补货节奏。",
    }


def test_graph_falls_back_to_deterministic_draft_when_llm_service_errors():
    class FailingDiagnosisService:
        def generate_diagnosis_draft(self, **kwargs):
            raise RuntimeError("upstream timeout")

    graph = build_graph(diagnosis_service=FailingDiagnosisService())

    result = graph.invoke(
        ClinicState(
            task_id="task-003",
            store_id="store-003",
            diagnosis_type="weekly",
            diagnosis_context="客流和转化同时下滑。",
        )
    )

    assert result["graph_stage"] == DIAGNOSE_STAGE
    assert result["diagnosis_source"] == "fallback"
    assert result["diagnosis_error"] == "upstream timeout"
    assert result["diagnosis_draft"] == {
        "title": "待人工补充诊断结论",
        "summary": "任务 task-003 已进入 weekly 诊断阶段，当前使用系统回退摘要。",
        "next_action": "补充门店关键指标后重新触发模型诊断。",
    }
