import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from store_ai_clinic.api.main import app
from store_ai_clinic.api.routers import conversations
from store_ai_clinic.db import session as db_session
from store_ai_clinic.db.base import Base
from store_ai_clinic.models.knowledge import KnowledgeChunk, KnowledgeSource
from store_ai_clinic.services.followups import generate_followup_suggestions
from store_ai_clinic.services.knowledge_retrieval import (
    KnowledgeCitation,
    KnowledgeRetrievalResult,
)


@pytest.fixture
def conversation_db(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(conversations, "SessionLocal", session_factory)

    try:
        yield
    finally:
        Base.metadata.drop_all(engine)


def test_create_session_endpoint_returns_active_session(conversation_db):
    client = TestClient(app)

    response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "hangzhou-xihu",
            "entry_mode": "manual",
            "initial_question": "Analyze Hangzhou West Lake store",
            "diagnosis_type_hint": "daily",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["session_id"]
    assert body["session_title"] == "Analyze Hangzhou Wes"
    assert body["status"] == "active"
    assert body["entry_mode"] == "manual"
    assert body["brand_id"] == "brand-acme"
    assert body["store_id"] == "hangzhou-xihu"


def test_conversations_crud_endpoints_support_blank_session_rename_and_delete(
    conversation_db,
):
    client = TestClient(app)

    create_response = client.post(
        "/api/conversations",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "   ",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    session_id = created["session_id"]
    assert created["session_title"] == "新诊断会话"
    assert created["title_source"] == "system"

    list_response = client.get("/api/conversations")

    assert list_response.status_code == 200
    sessions = list_response.json()
    assert any(item["session_id"] == session_id for item in sessions)

    patch_response = client.patch(
        f"/api/conversations/{session_id}",
        json={"session_title": "我的自定义标题"},
    )

    assert patch_response.status_code == 200
    patched = patch_response.json()
    assert patched["session_id"] == session_id
    assert patched["session_title"] == "我的自定义标题"
    assert patched["title_source"] == "user"

    delete_response = client.delete(f"/api/conversations/{session_id}")

    assert delete_response.status_code == 204
    assert delete_response.content == b""

    deleted_detail_response = client.get(f"/api/conversations/sessions/{session_id}")

    assert deleted_detail_response.status_code == 404


def test_post_message_endpoint_returns_assistant_message_and_followup_suggestions(
    conversation_db,
    monkeypatch,
):
    captured: dict[str, object] = {}

    def fake_run_diagnosis_task(**kwargs):
        captured.update(kwargs)
        return {
            "diagnosis_error": None,
            "diagnosis_draft": {
                "title": "Lunch-hour traffic is weak",
                "summary": "Orders dropped the most from 12:00 to 14:00.",
                "next_action": "Check staffing and in-store conversion first.",
            },
        }

    monkeypatch.setattr(conversations, "run_diagnosis_task", fake_run_diagnosis_task)

    client = TestClient(app)
    session_response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "Review today's store data",
        },
    )
    session_id = session_response.json()["session_id"]

    response = client.post(
        f"/api/conversations/sessions/{session_id}/messages",
        json={"message": "Please diagnose today's store performance"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "Lunch-hour traffic is weak" in body["assistant_message"]
    assert body["followup_suggestions"]
    assert all(
        set(item) == {"intent", "text", "suggestion_type"}
        for item in body["followup_suggestions"]
    )
    expected_suggestion = generate_followup_suggestions(
        stage="post_diagnosis",
        preferred_intents=["why_followup", "time_drilldown", "action_plan"],
    )[0]
    assert {
        "intent": expected_suggestion.intent,
        "text": expected_suggestion.text,
        "suggestion_type": expected_suggestion.suggestion_type,
    } in body["followup_suggestions"]
    assert body["citations"] == []
    assert body["evidence_summary"] == ""
    assert captured["session_id"] == session_id
    assert captured["analysis_mode"] == "conversation"


def test_post_message_endpoint_maps_value_error_to_bad_request(
    conversation_db,
    monkeypatch,
):
    def fake_run_orchestrator_turn(*args, **kwargs):
        raise ValueError("Cannot append message for this session")

    monkeypatch.setattr(conversations, "run_orchestrator_turn", fake_run_orchestrator_turn)

    client = TestClient(app)
    session_response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "Review today's store data",
        },
    )
    session_id = session_response.json()["session_id"]

    response = client.post(
        f"/api/conversations/sessions/{session_id}/messages",
        json={"message": "Please diagnose today's store performance"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Cannot append message for this session"}


def test_post_message_endpoint_surfaces_retrieval_citations(
    conversation_db,
    monkeypatch,
):
    def fake_run_diagnosis_task(**kwargs):
        return {
            "diagnosis_error": None,
            "diagnosis_draft": {
                "title": "Complaint handling is lagging",
                "summary": "First-response timing is slower than the operating standard.",
                "next_action": "Reinforce first-response execution at the store level.",
            },
        }

    def fake_retrieve_knowledge(
        *,
        query_text: str,
        session_id: str,
        store_id: str,
        db=None,
    ):
        assert query_text == "Complaint rate is rising"
        assert session_id
        assert store_id == "store-a"
        assert db is not None
        return KnowledgeRetrievalResult(
            query_text=query_text,
            citations=[
                KnowledgeCitation(
                    source_id="src_001",
                    source_title="门店客诉处理规范",
                    knowledge_type="sop",
                    page_no=24,
                    chapter_title="客诉升级处理",
                    quote_text="门店在收到客诉后，应在30分钟内完成首次响应。",
                    version_label="V3",
                ),
            ],
            evidence_summary="已引用 1 条 SOP 依据",
        )

    monkeypatch.setattr(conversations, "run_diagnosis_task", fake_run_diagnosis_task)
    monkeypatch.setattr(conversations, "retrieve_knowledge_for_turn", fake_retrieve_knowledge)

    client = TestClient(app)
    session_response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "Review today's store data",
        },
    )
    session_id = session_response.json()["session_id"]

    response = client.post(
        f"/api/conversations/sessions/{session_id}/messages",
        json={"message": "Complaint rate is rising"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["evidence_summary"] == "已引用 1 条 SOP 依据"
    assert body["citations"] == [
        {
            "source_id": "src_001",
            "source_title": "门店客诉处理规范",
            "knowledge_type": "sop",
            "page_no": 24,
            "chapter_title": "客诉升级处理",
            "quote_text": "门店在收到客诉后，应在30分钟内完成首次响应。",
            "version_label": "V3",
        }
    ]

    history_response = client.get(
        f"/api/conversations/sessions/{session_id}/messages"
    )
    assert history_response.status_code == 200
    history_body = history_response.json()
    assert history_body[1]["content_json"]["citations"] == body["citations"]
    assert history_body[1]["content_json"]["evidence_summary"] == "已引用 1 条 SOP 依据"


def test_post_message_endpoint_reads_published_knowledge_from_database(
    conversation_db,
    monkeypatch,
):
    def fake_run_diagnosis_task(**kwargs):
        return {
            "diagnosis_error": None,
            "diagnosis_draft": {
                "title": "Complaint handling is lagging",
                "summary": "First-response timing is slower than the operating standard.",
                "next_action": "Reinforce first-response execution at the store level.",
            },
        }

    monkeypatch.setattr(conversations, "run_diagnosis_task", fake_run_diagnosis_task)

    db = conversations.SessionLocal()
    try:
        db.add(
            KnowledgeSource(
                source_id="src_knowledge_001",
                source_title="门店客诉处理规范",
                knowledge_type="sop",
                status="published",
                version_label="V3",
                file_name="complaint-sop.pdf",
                file_path="/tmp/complaint-sop.pdf",
                mime_type="application/pdf",
            )
        )
        db.add(
            KnowledgeChunk(
                chunk_id="chunk_knowledge_001",
                source_id="src_knowledge_001",
                chunk_no=1,
                page_no=24,
                chapter_title="客诉升级处理",
                section_title="首响要求",
                chunk_text="门店在收到客诉后，应在30分钟内完成首次响应，并形成闭环记录。",
                summary_text="客诉首响必须在30分钟内完成。",
                quote_text="门店在收到客诉后，应在30分钟内完成首次响应。",
            )
        )
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    session_response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "Review today's store data",
        },
    )
    session_id = session_response.json()["session_id"]

    response = client.post(
        f"/api/conversations/sessions/{session_id}/messages",
        json={"message": "Complaint rate is rising"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["evidence_summary"] == "已引用 1 条知识库依据"
    assert len(body["citations"]) == 1
    assert body["citations"][0]["source_id"] == "src_knowledge_001"
    assert body["citations"][0]["source_title"] == "门店客诉处理规范"


def test_get_session_detail_and_message_history(conversation_db, monkeypatch):
    def fake_run_diagnosis_task(**kwargs):
        return {
            "diagnosis_error": None,
            "diagnosis_draft": {
                "title": "Lunch-hour traffic is weak",
                "summary": "Orders dropped the most from 12:00 to 14:00.",
                "next_action": "Check staffing and in-store conversion first.",
            },
        }

    monkeypatch.setattr(conversations, "run_diagnosis_task", fake_run_diagnosis_task)

    client = TestClient(app)
    session_response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "Review today's store data",
        },
    )
    session_id = session_response.json()["session_id"]

    client.post(
        f"/api/conversations/sessions/{session_id}/messages",
        json={"message": "Please diagnose today's store performance"},
    )

    detail_response = client.get(f"/api/conversations/sessions/{session_id}")
    messages_response = client.get(
        f"/api/conversations/sessions/{session_id}/messages"
    )

    assert detail_response.status_code == 200
    assert detail_response.json()["session_id"] == session_id
    assert detail_response.json()["store_id"] == "store-a"

    assert messages_response.status_code == 200
    body = messages_response.json()
    assert len(body) == 2
    assert body[0]["role"] == "user"
    assert body[0]["message_type"] == "question"
    assert body[0]["content_text"] == "Please diagnose today's store performance"
    assert body[1]["role"] == "assistant"
    assert "Lunch-hour traffic is weak" in body[1]["content_text"]


def test_app_startup_initializes_sqlite_tables_for_conversation_routes(
    monkeypatch,
    tmp_path,
):
    sqlite_path = tmp_path / "startup-runtime" / "conversations.sqlite3"
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite+pysqlite:///{sqlite_path}", future=True)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    monkeypatch.setattr(db_session, "engine", engine)
    monkeypatch.setattr(db_session, "SessionLocal", session_factory)
    monkeypatch.setattr(conversations, "SessionLocal", session_factory)

    with TestClient(app) as client:
        response = client.post(
            "/api/conversations/sessions",
            json={
                "brand_id": "brand-acme",
                "store_id": "hangzhou-xihu",
                "entry_mode": "manual",
                "initial_question": "Analyze Hangzhou West Lake store",
            },
        )

    assert response.status_code == 201
    assert sqlite_path.exists()
