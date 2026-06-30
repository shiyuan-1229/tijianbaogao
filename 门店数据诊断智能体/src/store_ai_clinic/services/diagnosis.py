from store_ai_clinic.workflows.graph import build_graph
from store_ai_clinic.workflows.state import ClinicState


def run_diagnosis_task(
    *,
    task_id: str,
    store_id: str,
    diagnosis_type: str,
    context: str,
    session_id: str | None = None,
    analysis_mode: str | None = None,
    trigger_reason: str | None = None,
) -> dict[str, object]:
    graph = build_graph()
    result = graph.invoke(
        ClinicState(
            task_id=task_id,
            store_id=store_id,
            diagnosis_type=diagnosis_type,
            diagnosis_context=context,
        )
    )

    return {
        "task_id": task_id,
        "store_id": store_id,
        "diagnosis_type": diagnosis_type,
        "session_id": session_id,
        "analysis_mode": analysis_mode,
        "trigger_reason": trigger_reason,
        "graph_stage": result.get("graph_stage"),
        "diagnosis_source": result.get("diagnosis_source"),
        "diagnosis_error": result.get("diagnosis_error"),
        "diagnosis_draft": result.get("diagnosis_draft"),
    }
