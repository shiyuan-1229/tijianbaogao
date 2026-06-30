from langgraph.graph import END, START, StateGraph

from store_ai_clinic.workflows.nodes import clean_validate, diagnose, ingest
from store_ai_clinic.workflows.state import (
    CLEAN_VALIDATE_STAGE,
    ClinicState,
    DIAGNOSE_STAGE,
    INGEST_STAGE,
)


def _route_after_clean_validate(state: ClinicState) -> str:
    if state.get("pause_signal") is not None:
        return END
    return DIAGNOSE_STAGE


def build_graph(*, diagnosis_service=None):
    graph = StateGraph(ClinicState)
    graph.add_node(INGEST_STAGE, ingest)
    graph.add_node(CLEAN_VALIDATE_STAGE, clean_validate)
    graph.add_node(
        DIAGNOSE_STAGE,
        lambda state: diagnose(state, diagnosis_service=diagnosis_service),
    )
    graph.add_edge(START, INGEST_STAGE)
    graph.add_edge(INGEST_STAGE, CLEAN_VALIDATE_STAGE)
    graph.add_conditional_edges(CLEAN_VALIDATE_STAGE, _route_after_clean_validate)
    graph.add_edge(DIAGNOSE_STAGE, END)
    return graph.compile()
