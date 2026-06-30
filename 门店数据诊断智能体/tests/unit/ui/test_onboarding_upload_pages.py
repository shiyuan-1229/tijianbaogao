from pathlib import Path

from streamlit.testing.v1 import AppTest

from services.frontend_api import FrontendApiError


ROOT = Path(__file__).resolve().parents[3]
ONBOARDING_PAGE = ROOT / "pages" / "02_\u54c1\u724c\u63a5\u5165.py"
UPLOAD_PAGE = ROOT / "pages" / "03_\u6279\u91cf\u4e0a\u4f20.py"


def test_task8_pages_expose_stable_widget_keys_for_critical_actions():
    onboarding = AppTest.from_file(str(ONBOARDING_PAGE), default_timeout=10)
    upload = AppTest.from_file(str(UPLOAD_PAGE), default_timeout=10)

    onboarding.run()
    upload.run()

    onboarding_button_keys = [button.key for button in onboarding.button]
    upload_button_keys = [button.key for button in upload.button]
    upload_uploader_keys = [uploader.key for uploader in upload.file_uploader]

    assert "preview-template" in onboarding_button_keys
    assert "batch-files" in upload_uploader_keys
    assert "preview-batch" in upload_button_keys


def test_onboarding_page_persists_brand_code_and_diagnosis_type_in_session_state():
    app = AppTest.from_file(str(ONBOARDING_PAGE), default_timeout=10)

    app.run()
    app.text_input(key="brand_code").set_value("northwind")
    app.selectbox(key="diagnosis_type").set_value("weekly")
    app.run()

    assert app.session_state["brand_code"] == "northwind"
    assert app.session_state["diagnosis_type"] == "weekly"


def test_onboarding_page_surfaces_frontend_api_error(monkeypatch):
    def fake_preview_template(payload: dict[str, object]) -> dict[str, object]:
        raise FrontendApiError("preview exploded")

    monkeypatch.setattr("services.frontend_api.preview_template", fake_preview_template)

    app = AppTest.from_file(str(ONBOARDING_PAGE), default_timeout=10)

    app.run()
    app.button(key="preview-template").click()
    app.run()

    assert any(
        "preview exploded" in element.value for element in app.error
    )


def test_onboarding_page_confirm_stores_onboarding_profile(monkeypatch):
    def fake_preview_template(payload: dict[str, object]) -> dict[str, object]:
        return {
            "required_tokens": ["brand_code", "store_code", "biz_date", "report_type"],
            "report_types": ["daily", "weekly"],
            "example": "northwind_SH001_20260609_weekly.xlsx",
        }

    monkeypatch.setattr("services.frontend_api.preview_template", fake_preview_template)

    app = AppTest.from_file(str(ONBOARDING_PAGE), default_timeout=10)

    app.run()
    app.text_input(key="brand_code").set_value("northwind")
    app.selectbox(key="diagnosis_type").set_value("weekly")
    app.file_uploader(key="sample-files").set_value(
        ("northwind_SH001_20260609_weekly.xlsx", b"mock", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    )
    app.button(key="confirm-onboarding").click()
    app.run()

    assert app.session_state["onboarding_profile"] == {
        "brand_name": "Acme Coffee",
        "brand_code": "northwind",
        "diagnosis_type": "weekly",
        "timezone": "Asia/Shanghai",
        "pattern": "{brand_code}_{store_code}_{biz_date}_{report_type}.xlsx",
        "sample_files": ["northwind_SH001_20260609_weekly.xlsx"],
        "template_example": "northwind_SH001_20260609_weekly.xlsx",
    }


def test_upload_page_uses_session_state_context_for_preview(monkeypatch):
    captured: dict[str, object] = {}

    def fake_preview_batch(payload: dict[str, object]) -> dict[str, object]:
        captured["payload"] = payload
        return {"store_task_count": 1, "grouped_files": {"SH001": ["northwind_SH001_20260609_weekly.xlsx"]}}

    monkeypatch.setattr("services.frontend_api.preview_batch", fake_preview_batch)

    app = AppTest.from_file(str(UPLOAD_PAGE), default_timeout=10)
    app.session_state["brand_code"] = "northwind"
    app.session_state["diagnosis_type"] = "weekly"

    app.run()
    app.file_uploader(key="batch-files").set_value(
        ("northwind_SH001_20260609_weekly.xlsx", b"mock", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    )
    app.button(key="preview-batch").click()
    app.run()

    assert captured["payload"] == {
        "brand_code": "northwind",
        "diagnosis_type": "weekly",
        "files": ["northwind_SH001_20260609_weekly.xlsx"],
    }
    assert app.session_state["batch_preview_result"] == {
        "store_task_count": 1,
        "grouped_files": {"SH001": ["northwind_SH001_20260609_weekly.xlsx"]},
    }


def test_upload_page_warns_when_preview_is_requested_without_files():
    app = AppTest.from_file(str(UPLOAD_PAGE), default_timeout=10)
    app.session_state["brand_code"] = "acme"
    app.session_state["diagnosis_type"] = "daily"

    app.run()
    app.button(key="preview-batch").click()
    app.run()

    assert any(
        "\u81f3\u5c11\u4e00\u4e2a" in element.value for element in app.warning
    )


def test_upload_page_warns_when_onboarding_context_is_missing():
    app = AppTest.from_file(str(UPLOAD_PAGE), default_timeout=10)
    app.session_state["brand_code"] = ""
    app.session_state["diagnosis_type"] = ""

    app.run()
    app.file_uploader(key="batch-files").set_value(("acme_SH001_20260609_daily.xlsx", b"mock", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
    app.button(key="preview-batch").click()
    app.run()

    assert any(
        "\u54c1\u724c\u63a5\u5165\u9875" in element.value for element in app.warning
    )


def test_upload_page_surfaces_frontend_api_error(monkeypatch):
    def fake_preview_batch(payload: dict[str, object]) -> dict[str, object]:
        raise FrontendApiError("batch exploded")

    monkeypatch.setattr("services.frontend_api.preview_batch", fake_preview_batch)

    app = AppTest.from_file(str(UPLOAD_PAGE), default_timeout=10)
    app.session_state["brand_code"] = "acme"
    app.session_state["diagnosis_type"] = "daily"

    app.run()
    app.file_uploader(key="batch-files").set_value(("acme_SH001_20260609_daily.xlsx", b"mock", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
    app.button(key="preview-batch").click()
    app.run()

    assert any(
        "batch exploded" in element.value for element in app.error
    )
