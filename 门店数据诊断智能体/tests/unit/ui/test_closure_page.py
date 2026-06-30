from pathlib import Path

from streamlit.testing.v1 import AppTest


ROOT = Path(__file__).resolve().parents[3]
CLOSURE_PAGE = ROOT / "pages" / "06_\u5361\u7247\u95ed\u73af.py"


def test_closure_page_exposes_filter_and_action_widget_keys():
    app = AppTest.from_file(str(CLOSURE_PAGE), default_timeout=20)

    app.run()

    button_keys = [button.key for button in app.button]
    selectbox_keys = [selectbox.key for selectbox in app.selectbox]

    assert "closure-brand-filter" in selectbox_keys
    assert "closure-status-filter" in selectbox_keys
    assert "card-action-confirm" in button_keys


def test_closure_page_updates_card_status_after_primary_action():
    app = AppTest.from_file(str(CLOSURE_PAGE), default_timeout=20)

    app.run()
    app.button(key="card-action-confirm").click()
    app.run()

    assert app.session_state["closure_status_overrides"]["card-1001"] == "processing"
    assert any("card-1001 状态已更新为 processing" in element.value for element in app.success)
