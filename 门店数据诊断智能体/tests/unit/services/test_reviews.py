import pytest
import requests

from store_ai_clinic.services.onboarding import preview_template_parse

from services.frontend_api import FrontendApiError, preview_batch, run_diagnosis


def test_preview_template_parse_returns_required_tokens_and_report_types():
    preview = preview_template_parse(
        "{brand_code}_{store_code}_{biz_date}_{report_type}.xlsx"
    )

    assert preview["required_tokens"] == [
        "brand_code",
        "store_code",
        "biz_date",
        "report_type",
    ]
    assert preview["report_types"] == ["daily", "weekly"]


def test_preview_template_parse_rejects_missing_required_tokens():
    with pytest.raises(
        ValueError,
        match=r"Template pattern is missing required tokens: report_type",
    ):
        preview_template_parse("{brand_code}_{store_code}_{biz_date}.xlsx")


def test_preview_batch_posts_payload_to_batch_preview_endpoint(monkeypatch):
    captured: dict[str, object] = {}

    class DummyResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"store_task_count": 1}

    def fake_post(url: str, *, json: dict[str, object], timeout: int) -> DummyResponse:
        captured["url"] = url
        captured["json"] = json
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr("services.frontend_api.requests.post", fake_post)

    payload = {
        "brand_code": "acme",
        "diagnosis_type": "daily",
        "files": ["acme_SH001_20260609_daily.xlsx"],
    }

    result = preview_batch(payload)

    assert result == {"store_task_count": 1}
    assert captured["url"].endswith("/api/batches/preview")
    assert captured["json"] == payload
    assert captured["timeout"] == 5


def test_preview_batch_wraps_malformed_json_response(monkeypatch):
    class DummyResponse:
        status_code = 200
        text = "not-json"

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            raise ValueError("bad json")

    monkeypatch.setattr(
        "services.frontend_api.requests.post",
        lambda *args, **kwargs: DummyResponse(),
    )

    with pytest.raises(
        FrontendApiError,
        match=r"Batch preview returned an invalid JSON response",
    ):
        preview_batch(
            {
                "brand_code": "acme",
                "diagnosis_type": "daily",
                "files": ["acme_SH001_20260609_daily.xlsx"],
            }
        )


def test_preview_batch_surfaces_backend_detail_message(monkeypatch):
    class DummyResponse:
        status_code = 400

        def raise_for_status(self) -> None:
            raise requests.HTTPError("bad request")

        def json(self) -> dict[str, object]:
            return {"detail": "Brand mismatch for file.xlsx: expected acme, got other"}

    monkeypatch.setattr(
        "services.frontend_api.requests.post",
        lambda *args, **kwargs: DummyResponse(),
    )

    with pytest.raises(
        FrontendApiError,
        match=r"Brand mismatch for file.xlsx: expected acme, got other",
    ):
        preview_batch(
            {
                "brand_code": "acme",
                "diagnosis_type": "daily",
                "files": ["file.xlsx"],
            }
        )


def test_preview_batch_surfaces_validation_error_details(monkeypatch):
    class DummyResponse:
        status_code = 422

        def raise_for_status(self) -> None:
            raise requests.HTTPError("unprocessable entity")

        def json(self) -> dict[str, object]:
            return {
                "detail": [
                    {"loc": ["body", "brand_code"], "msg": "Field required"},
                    {"loc": ["body", "files"], "msg": "Input should have at least 1 item"},
                ]
            }

    monkeypatch.setattr(
        "services.frontend_api.requests.post",
        lambda *args, **kwargs: DummyResponse(),
    )

    with pytest.raises(
        FrontendApiError,
        match=r"brand_code: Field required; files: Input should have at least 1 item",
    ):
        preview_batch(
            {
                "brand_code": "",
                "diagnosis_type": "daily",
                "files": [],
            }
        )


def test_run_diagnosis_posts_payload_to_diagnosis_endpoint(monkeypatch):
    captured: dict[str, object] = {}

    class DummyResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "task_id": "task-1002",
                "store_id": "SH002",
                "diagnosis_type": "daily",
                "graph_stage": "diagnose",
                "diagnosis_source": "llm",
                "diagnosis_error": None,
                "diagnosis_draft": {
                    "title": "库存周转偏低",
                    "summary": "近 7 日库存周转率低于阈值。",
                    "next_action": "优先复核补货节奏。",
                },
            }

    def fake_post(url: str, *, json: dict[str, object], timeout: int) -> DummyResponse:
        captured["url"] = url
        captured["json"] = json
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr("services.frontend_api.requests.post", fake_post)

    payload = {
        "task_id": "task-1002",
        "store_id": "SH002",
        "diagnosis_type": "daily",
        "context": "近7日库存周转率2.1，品牌阈值3.0。",
    }

    result = run_diagnosis(payload)

    assert result["diagnosis_source"] == "llm"
    assert captured["url"].endswith("/api/diagnosis/run")
    assert captured["json"] == payload
    assert captured["timeout"] == 30
