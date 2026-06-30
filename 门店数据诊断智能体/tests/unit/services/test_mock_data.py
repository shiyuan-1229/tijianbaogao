from services import mock_data
from store_ai_clinic.models.enums import GraphStage, TaskStatus


def test_task_rows_use_backend_supported_status_and_graph_stage_values():
    supported_statuses = {status.value for status in TaskStatus}
    supported_graph_stages = {stage.value for stage in GraphStage}

    for task in mock_data.task_rows():
        assert task["task_status"] in supported_statuses
        assert task["graph_stage"] in supported_graph_stages
