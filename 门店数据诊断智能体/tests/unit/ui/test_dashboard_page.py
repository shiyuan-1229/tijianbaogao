from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

from streamlit.testing.v1 import AppTest

from components import tables
from services import mock_data

ROOT = Path(__file__).resolve().parents[3]


def test_dashboard_page_renders_summary_and_todo():
    app = AppTest.from_file(str(ROOT / "pages" / "01_首页指挥台.py"), default_timeout=10)

    app.run()

    metric_values = {metric.label: metric.value for metric in app.metric}
    markdown_values = [element.value for element in app.markdown]

    assert app.title[0].value == "首页指挥台"
    assert metric_values == {
        "运行中任务": "1",
        "待人工确认": "3",
        "SLA 风险": "1",
        "已完成闭环": "1",
    }
    assert any("今日待办" in value for value in markdown_values)
    assert any("优先处理任务" in value and "task-1001" in value for value in markdown_values)
    assert any("最新人工确认队列" in value and "字段映射确认" in value for value in markdown_values)
    assert any("首条任务为 task-1001" in value for value in markdown_values)


def test_task_overview_page_renders_dataframe_and_first_task_detail():
    app = AppTest.from_file(str(ROOT / "pages" / "04_任务总览.py"), default_timeout=10)

    app.run()

    dataframe_rows = app.dataframe[0].value.to_dict(orient="records")
    markdown_values = [element.value for element in app.markdown]

    assert app.title[0].value == "任务总览"
    assert len(dataframe_rows) == 5
    assert dataframe_rows[0]["任务 ID"] == "task-1001"
    assert any(row["任务 ID"] == "task-1004" for row in dataframe_rows)
    assert app.subheader[0].value == "任务详情"
    assert any("**任务 ID**：task-1001" == value for value in markdown_values)
    assert any("**任务状态**：waiting_human" == value for value in markdown_values)


def test_task_overview_page_runs_live_diagnosis_and_renders_result(monkeypatch):
    def fake_run_diagnosis(payload: dict[str, object]) -> dict[str, object]:
        assert payload["task_id"] == "task-1001"
        assert payload["store_id"] == "SH001"
        return {
            "task_id": "task-1001",
            "store_id": "SH001",
            "diagnosis_type": "daily",
            "graph_stage": "diagnose",
            "diagnosis_source": "llm",
            "diagnosis_error": None,
            "diagnosis_draft": {
                "title": "库存周转偏低",
                "summary": "近 7 日库存周转率低于品牌阈值。",
                "next_action": "优先复核补货节奏。",
            },
        }

    monkeypatch.setattr("services.frontend_api.run_diagnosis", fake_run_diagnosis)

    app = AppTest.from_file(str(ROOT / "pages" / "04_任务总览.py"), default_timeout=10)

    app.run()
    app.button(key="run-live-diagnosis").click()
    app.run()

    markdown_values = [element.value for element in app.markdown]

    assert any("**诊断标题**：库存周转偏低" == value for value in markdown_values)
    assert any("**建议动作**：优先复核补货节奏。" == value for value in markdown_values)
    assert app.session_state["latest_diagnosis_result"]["diagnosis_source"] == "llm"


def test_dashboard_page_handles_empty_mock_tasks(monkeypatch):
    info_calls: list[str] = []

    monkeypatch.setattr(mock_data, "task_rows", lambda: [])
    monkeypatch.setattr(mock_data, "review_rows", lambda: {})
    monkeypatch.setattr("streamlit.info", info_calls.append)

    page_path = ROOT / "pages" / "01_首页指挥台.py"
    spec = spec_from_file_location("task7_dashboard_empty_state", page_path)
    assert spec is not None
    assert spec.loader is not None
    module = module_from_spec(spec)

    spec.loader.exec_module(module)

    assert "暂无待处理人工确认任务，当前链路运行平稳。" in info_calls


def test_task_overview_page_handles_empty_mock_tasks(monkeypatch):
    info_calls: list[str] = []
    detail_calls: list[dict[str, object]] = []

    monkeypatch.setattr(mock_data, "task_rows", lambda: [])
    monkeypatch.setattr(tables, "render_task_detail", detail_calls.append)
    monkeypatch.setattr("streamlit.info", info_calls.append)

    page_path = ROOT / "pages" / "04_任务总览.py"
    spec = spec_from_file_location("task7_task_overview_empty_state", page_path)
    assert spec is not None
    assert spec.loader is not None
    module = module_from_spec(spec)

    spec.loader.exec_module(module)

    assert detail_calls == []
    assert "当前没有可展示的任务，等待新的诊断批次进入。" in info_calls


def test_mock_data_rejects_waiting_human_tasks_without_review_fields():
    invalid_rows = [
        {
            "task_id": "task-bad",
            "brand": "Acme Coffee",
            "store": "SH999",
            "diagnosis_type": "daily",
            "task_status": "waiting_human",
            "graph_stage": "clean_validate",
            "sla_risk": False,
        }
    ]

    try:
        mock_data.validate_task_rows(invalid_rows)
    except ValueError as exc:
        assert "waiting_human" in str(exc)
        assert "review_queue" in str(exc)
        assert "review_reason" in str(exc)
    else:
        raise AssertionError("expected validate_task_rows() to reject incomplete waiting_human tasks")


def test_mock_data_waiting_human_count_matches_review_queue_items():
    summary = mock_data.dashboard_summary()
    queue_total = sum(len(items) for items in mock_data.review_rows().values())

    assert summary["waiting_human"] == queue_total


def test_mock_data_rejects_unknown_review_queue_values():
    invalid_rows = [
        {
            "task_id": "task-bad-queue",
            "brand": "Acme Coffee",
            "store": "SH998",
            "diagnosis_type": "daily",
            "task_status": "waiting_human",
            "graph_stage": "clean_validate",
            "sla_risk": False,
            "review_queue": "字段映射確认",
            "review_reason": "字段别名冲突",
        }
    ]

    try:
        mock_data.validate_task_rows(invalid_rows)
    except ValueError as exc:
        assert "review_queue" in str(exc)
        assert "字段映射確认" in str(exc)
    else:
        raise AssertionError("expected validate_task_rows() to reject unknown review_queue values")
