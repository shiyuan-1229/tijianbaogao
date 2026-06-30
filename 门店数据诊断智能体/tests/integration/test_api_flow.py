import pytest
from fastapi.testclient import TestClient

from store_ai_clinic.api import main
from store_ai_clinic.api.main import app


def test_api_health_and_batch_preview_flow():
    client = TestClient(app)

    health_response = client.get("/health")

    assert health_response.status_code == 200
    assert health_response.json() == {"status": "ok"}

    preview_response = client.post(
        "/api/batches/preview",
        json={
            "brand_code": "acme",
            "diagnosis_type": "daily",
            "files": ["acme_SH001_20260609_daily.xlsx"],
        },
    )

    assert preview_response.status_code == 200
    assert preview_response.json() == {
        "store_task_count": 1,
        "grouped_files": {
            "SH001": ["acme_SH001_20260609_daily.xlsx"],
        },
    }


def test_debug_llm_endpoint_returns_masked_configuration(monkeypatch):
    monkeypatch.setattr(main.settings, "openai_api_key", "project-file-key", raising=False)
    monkeypatch.setattr(
        main.settings,
        "openai_base_url",
        "https://api.deepseek.com/v1",
        raising=False,
    )
    monkeypatch.setattr(main.settings, "openai_model", "deepseek-chat", raising=False)

    client = TestClient(app)

    response = client.get("/api/debug/llm")

    assert response.status_code == 200
    assert response.json() == {
        "model": "deepseek-chat",
        "base_url": "https://api.deepseek.com/v1",
        "key_loaded": True,
        "key_prefix": "project-",
        "key_length": 16,
    }


def test_onboarding_template_preview_flow():
    client = TestClient(app)

    preview_response = client.post(
        "/api/onboarding/template-preview",
        json={"pattern": "{brand_code}_{store_code}_{biz_date}_{report_type}.xlsx"},
    )

    assert preview_response.status_code == 200
    assert preview_response.json() == {
        "required_tokens": [
            "brand_code",
            "store_code",
            "biz_date",
            "report_type",
        ],
        "report_types": ["daily", "weekly"],
        "example": "acme_SH001_20260609_daily.xlsx",
    }


def test_onboarding_template_preview_requires_pattern_field():
    client = TestClient(app, raise_server_exceptions=False)

    preview_response = client.post("/api/onboarding/template-preview", json={})

    assert preview_response.status_code == 422
    error_fields = [error["loc"][-1] for error in preview_response.json()["detail"]]
    assert "pattern" in error_fields


def test_diagnosis_run_returns_structured_payload(monkeypatch):
    def fake_run_diagnosis_task(**kwargs):
        return {
            "task_id": "task-1002",
            "store_id": "SH002",
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

    monkeypatch.setattr(
        "store_ai_clinic.api.routers.diagnosis.run_diagnosis_task",
        fake_run_diagnosis_task,
    )

    client = TestClient(app)

    diagnosis_response = client.post(
        "/api/diagnosis/run",
        json={
            "task_id": "task-1002",
            "store_id": "SH002",
            "diagnosis_type": "daily",
            "context": "近7日库存周转率2.1，品牌阈值3.0。",
        },
    )

    assert diagnosis_response.status_code == 200
    assert diagnosis_response.json() == {
        "task_id": "task-1002",
        "store_id": "SH002",
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


def test_diagnosis_run_rejects_missing_context_field():
    client = TestClient(app, raise_server_exceptions=False)

    diagnosis_response = client.post(
        "/api/diagnosis/run",
        json={
            "task_id": "task-1002",
            "store_id": "SH002",
            "diagnosis_type": "daily",
        },
    )

    assert diagnosis_response.status_code == 422
    error_fields = [error["loc"][-1] for error in diagnosis_response.json()["detail"]]
    assert "context" in error_fields


def test_batch_preview_rejects_report_type_mismatch_for_requested_diagnosis():
    client = TestClient(app, raise_server_exceptions=False)

    preview_response = client.post(
        "/api/batches/preview",
        json={
            "brand_code": "acme",
            "diagnosis_type": "daily",
            "files": ["acme_SH001_20260609_weekly.xlsx"],
        },
    )

    assert preview_response.status_code == 400
    assert preview_response.json() == {
        "detail": (
            "File acme_SH001_20260609_weekly.xlsx report type weekly does not match "
            "requested diagnosis_type daily"
        )
    }


def test_batch_preview_rejects_invalid_file_name_with_bad_request():
    client = TestClient(app, raise_server_exceptions=False)

    preview_response = client.post(
        "/api/batches/preview",
        json={
            "brand_code": "acme",
            "diagnosis_type": "daily",
            "files": ["bad-file-name.xlsx"],
        },
    )

    assert preview_response.status_code == 400
    assert preview_response.json() == {
        "detail": "Invalid file name: bad-file-name.xlsx"
    }


def test_batch_preview_rejects_brand_mismatch_with_bad_request():
    client = TestClient(app, raise_server_exceptions=False)

    preview_response = client.post(
        "/api/batches/preview",
        json={
            "brand_code": "acme",
            "diagnosis_type": "daily",
            "files": ["other_SH001_20260609_daily.xlsx"],
        },
    )

    assert preview_response.status_code == 400
    assert preview_response.json() == {
        "detail": (
            "Brand mismatch for other_SH001_20260609_daily.xlsx: "
            "expected acme, got other"
        )
    }


def test_card_transition_rejects_unsupported_transition_combination():
    client = TestClient(app, raise_server_exceptions=False)

    transition_response = client.post(
        "/api/cards/transition",
        json={"current_status": "completed", "action": "confirm"},
    )

    assert transition_response.status_code == 400
    assert transition_response.json() == {
        "detail": "Unsupported card transition: completed -> confirm"
    }


def test_card_transition_returns_next_status_payload_for_supported_transition():
    client = TestClient(app)

    transition_response = client.post(
        "/api/cards/transition",
        json={"current_status": "pending_review", "action": "confirm"},
    )

    assert transition_response.status_code == 200
    assert transition_response.json() == {"status": "processing"}


def test_review_resume_rejects_invalid_resolution_value():
    client = TestClient(app, raise_server_exceptions=False)

    resume_response = client.post(
        "/api/reviews/resume",
        json={
            "task_id": "task-1001",
            "resolution": "reopened",
            "remark": "Try again",
        },
    )

    assert resume_response.status_code == 422
    error_fields = [error["loc"][-1] for error in resume_response.json()["detail"]]
    assert "resolution" in error_fields


def test_review_resume_returns_normalized_payload_for_valid_request():
    client = TestClient(app)

    resume_response = client.post(
        "/api/reviews/resume",
        json={
            "task_id": " task-1001 ",
            "resolution": "approved",
            "remark": " Reviewed and resumed ",
        },
    )

    assert resume_response.status_code == 200
    assert resume_response.json() == {
        "task_id": "task-1001",
        "resolution": "approved",
        "remark": "Reviewed and resumed",
        "resume_from_checkpoint": True,
    }


@pytest.mark.parametrize("field_name", ["task_id", "remark"])
def test_review_resume_rejects_whitespace_only_required_fields(field_name: str):
    client = TestClient(app, raise_server_exceptions=False)

    payload = {
        "task_id": "task-1001",
        "resolution": "approved",
        "remark": "Reviewed and resumed",
    }
    payload[field_name] = "   "

    resume_response = client.post("/api/reviews/resume", json=payload)

    assert resume_response.status_code == 422
    error_fields = [error["loc"][-1] for error in resume_response.json()["detail"]]
    assert field_name in error_fields


@pytest.mark.parametrize(
    ("payload", "expected_error_field"),
    [
        (
            {
                "brand_code": "acme",
                "diagnosis_type": "monthly",
                "files": ["acme_SH001_20260609_daily.xlsx"],
            },
            "diagnosis_type",
        ),
        (
            {
                "brand_code": "",
                "diagnosis_type": "daily",
                "files": ["acme_SH001_20260609_daily.xlsx"],
            },
            "brand_code",
        ),
        (
            {
                "brand_code": "acme",
                "diagnosis_type": "daily",
                "files": [],
            },
            "files",
        ),
    ],
)
def test_batch_preview_rejects_invalid_request_payloads(payload, expected_error_field):
    client = TestClient(app, raise_server_exceptions=False)

    preview_response = client.post("/api/batches/preview", json=payload)

    assert preview_response.status_code == 422
    error_fields = [error["loc"][-1] for error in preview_response.json()["detail"]]
    assert expected_error_field in error_fields
