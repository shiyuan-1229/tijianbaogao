from pathlib import Path

from streamlit.testing.v1 import AppTest


ROOT = Path(__file__).resolve().parents[3]


def test_review_page_renders_three_review_queues():
    app = AppTest.from_file(str(ROOT / "pages" / "05_人工确认台.py"), default_timeout=10)

    app.run()

    markdown_values = [element.value for element in app.markdown]
    button_keys = [button.key for button in app.button]

    assert app.title[0].value == "人工确认台"
    assert any("字段映射确认" in value for value in markdown_values)
    assert any("数据质量确认" in value for value in markdown_values)
    assert any("诊断复核确认" in value for value in markdown_values)
    assert any("**任务 ID**：task-1001" == value for value in markdown_values)
    assert any("**任务 ID**：task-1003" == value for value in markdown_values)
    assert any("**任务 ID**：task-1004" == value for value in markdown_values)
    assert any("**暂停原因**：字段别名冲突" == value for value in markdown_values)
    assert any("**暂停原因**：关键指标缺失" == value for value in markdown_values)
    assert any("**暂停原因**：结论置信度偏低" == value for value in markdown_values)
    assert button_keys == [
        "resume-task-1001",
        "resume-task-1003",
        "resume-task-1004",
    ]
