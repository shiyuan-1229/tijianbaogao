import time

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.conversations import (
    AgentSession,
    DiagnosisMemoryCard,
    FollowupSuggestion,
    MessageDiagnosisLink,
    SessionMemorySnapshot,
)
from store_ai_clinic.models.enums import DiagnosisType
from store_ai_clinic.schemas.conversations import CreateSessionRequest, SessionResponse
from store_ai_clinic.services.conversation_messages import append_message
from store_ai_clinic.services.conversation_sessions import (
    DEFAULT_SESSION_TITLE,
    MULTI_STORE_COMPARISON_TITLE,
    TITLE_SOURCE_SYSTEM,
    TITLE_SOURCE_USER,
    build_session_title,
    create_session,
    delete_session,
    list_sessions,
    rename_session,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def test_create_session_request_trims_and_validates_fields():
    request = CreateSessionRequest(
        brand_id="  brand-acme  ",
        store_id="  hangzhou-xihu  ",
        entry_mode="manual",
        initial_question="  Analyze Hangzhou West Lake store  ",
        diagnosis_type_hint=DiagnosisType.DAILY,
    )

    assert request.brand_id == "brand-acme"
    assert request.store_id == "hangzhou-xihu"
    assert request.initial_question == "Analyze Hangzhou West Lake store"
    assert request.diagnosis_type_hint == DiagnosisType.DAILY


@pytest.mark.parametrize("field_name", ["brand_id", "store_id"])
def test_create_session_request_rejects_blank_required_fields(field_name):
    payload = {
        "brand_id": "brand-acme",
        "store_id": "hangzhou-xihu",
        "entry_mode": "manual",
        "initial_question": "Analyze Hangzhou West Lake store",
    }
    payload[field_name] = "   "

    with pytest.raises(ValidationError) as excinfo:
        CreateSessionRequest(**payload)

    assert "must not be empty" in str(excinfo.value)


def test_create_session_request_allows_blank_initial_question():
    request = CreateSessionRequest(
        brand_id="  brand-acme  ",
        store_id="  store-a  ",
        entry_mode="manual",
        initial_question="   ",
    )

    assert request.brand_id == "brand-acme"
    assert request.store_id == "store-a"
    assert request.initial_question == ""


def test_session_response_requires_expected_fields():
    response = SessionResponse(
        session_id="session-123",
        session_title="Analyze Hangzhou West Lake store",
        title_source=TITLE_SOURCE_SYSTEM,
        status="active",
        entry_mode="manual",
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
    )

    assert response.session_id == "session-123"
    assert response.session_title == "Analyze Hangzhou West Lake store"
    assert response.title_source == TITLE_SOURCE_SYSTEM
    assert response.status == "active"
    assert response.entry_mode == "manual"


def test_session_response_rejects_invalid_status():
    with pytest.raises(ValidationError) as excinfo:
        SessionResponse(
            session_id="session-123",
            session_title="Analyze Hangzhou West Lake store",
            title_source=TITLE_SOURCE_SYSTEM,
            status="pending",
            entry_mode="manual",
            brand_id="brand-acme",
            store_id="hangzhou-xihu",
        )

    assert "active" in str(excinfo.value)
    assert "archived" in str(excinfo.value)
    assert "closed" in str(excinfo.value)


def test_agent_session_updated_at_changes_on_update(db_session):
    session = AgentSession(
        session_id="session-123",
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        session_title="Analyze Hangzhou West Lake store",
        status="active",
        entry_mode="manual",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    original_updated_at = session.updated_at

    time.sleep(0.01)
    session.session_title = "Analyze Hangzhou Xihu store"
    db_session.commit()
    db_session.refresh(session)

    assert session.updated_at > original_updated_at


def test_create_session_returns_active_session(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )

    assert session.status == "active"
    assert session.session_title == "Analyze Hangzhou Wes"
    assert session.title_source == TITLE_SOURCE_SYSTEM
    assert db_session.get(AgentSession, session.session_id) is session


def test_create_session_uses_default_system_title_when_question_missing(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="   ",
    )

    assert session.session_title == DEFAULT_SESSION_TITLE
    assert session.title_source == TITLE_SOURCE_SYSTEM


def test_create_session_generates_short_title_from_first_question(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="分析杭州西湖店日报，看看为什么转化下降",
    )

    assert session.session_title == "杭州西湖店日报诊断"
    assert session.title_source == TITLE_SOURCE_SYSTEM
    assert len(session.session_title) <= 20


def test_rename_session_marks_title_as_user_owned(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="分析杭州西湖店日报，看看为什么转化下降",
    )

    renamed = rename_session(
        db_session,
        session_id=session.session_id,
        session_title="西湖店日报重点诊断",
    )

    assert renamed.session_title == "西湖店日报重点诊断"
    assert renamed.title_source == TITLE_SOURCE_USER


def test_delete_session_cleans_up_session_owned_records_and_detaches_memory_cards(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="分析杭州西湖店日报，看看为什么转化下降",
    )
    message = append_message(
        db_session,
        session_id=session.session_id,
        role="user",
        message_type="question",
        content_text="先看客流和转化",
    )
    snapshot = SessionMemorySnapshot(
        snapshot_id="snapshot-001",
        session_id=session.session_id,
        summary_text="summary",
        summary_json={"a": 1},
        coverage_message_start_id=message.message_id,
        coverage_message_end_id=message.message_id,
        compression_level="rolling",
    )
    link = MessageDiagnosisLink(
        id="link-001",
        session_id=session.session_id,
        message_id=message.message_id,
        task_id="task-001",
        link_type="primary",
    )
    suggestion = FollowupSuggestion(
        suggestion_id="suggestion-001",
        session_id=session.session_id,
        message_id=message.message_id,
        suggestion_text="继续深挖原因",
        suggestion_type="followup",
        rank_order=1,
        accepted=False,
    )
    memory_card = DiagnosisMemoryCard(
        memory_id="memory-001",
        source_task_id=None,
        source_result_id=None,
        session_id=session.session_id,
        brand_id="brand-acme",
        store_id="store-a",
        diagnosis_type="daily",
        title="诊断卡片",
        summary="保留历史卡片",
        tags_json={},
        importance_score=0.3,
    )
    db_session.add_all([snapshot, link, suggestion, memory_card])
    db_session.flush()

    deleted = delete_session(db_session, session_id=session.session_id)

    assert deleted is True
    assert db_session.get(AgentSession, session.session_id) is None
    assert db_session.get(type(message), message.message_id) is None
    assert db_session.get(SessionMemorySnapshot, snapshot.snapshot_id) is None
    assert db_session.get(MessageDiagnosisLink, link.id) is None
    assert db_session.get(FollowupSuggestion, suggestion.suggestion_id) is None
    detached_memory_card = db_session.get(DiagnosisMemoryCard, memory_card.memory_id)
    assert detached_memory_card is not None
    assert detached_memory_card.session_id is None


def test_delete_session_returns_false_for_missing_session(db_session):
    assert delete_session(db_session, session_id="missing-session") is False


def test_append_message_updates_default_title_only_for_system_owned_blank_session(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="",
    )

    append_message(
        db_session,
        session_id=session.session_id,
        role="user",
        message_type="question",
        content_text="比较杭州和南京门店表现，找出差距",
    )
    db_session.refresh(session)

    assert session.session_title == MULTI_STORE_COMPARISON_TITLE
    assert session.title_source == TITLE_SOURCE_SYSTEM


def test_append_message_does_not_override_user_owned_title(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="",
    )
    rename_session(
        db_session,
        session_id=session.session_id,
        session_title="我的自定义标题",
    )

    append_message(
        db_session,
        session_id=session.session_id,
        role="user",
        message_type="question",
        content_text="比较杭州和南京门店表现，找出差距",
    )
    db_session.refresh(session)

    assert session.session_title == "我的自定义标题"
    assert session.title_source == TITLE_SOURCE_USER


def test_build_session_title_detects_generic_multi_store_comparison():
    assert build_session_title("比较各门店本周表现，看看谁掉队了") == MULTI_STORE_COMPARISON_TITLE


def test_build_session_title_truncates_generic_question_without_pattern():
    assert build_session_title("请帮我系统梳理最近一个月会员转化变化和原因") == "请帮我系统梳理最近一个月会员转化变化和原"


def test_create_session_does_not_commit_transaction(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )

    db_session.rollback()

    assert db_session.get(AgentSession, session.session_id) is None


def test_append_message_updates_last_user_timestamp(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )

    message = append_message(
        db_session,
        session_id=session.session_id,
        role="user",
        message_type="question",
        content_text="Why did it drop?",
    )

    db_session.refresh(session)

    assert message.session_id == session.session_id
    assert session.last_user_message_at is not None


def test_append_message_rejects_unknown_session(db_session):
    with pytest.raises(ValueError, match="Unknown session_id: missing-session"):
        append_message(
            db_session,
            session_id="missing-session",
            role="user",
            message_type="question",
            content_text="Why did it drop?",
        )


def test_append_message_rejects_invalid_role(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )

    with pytest.raises(ValueError, match="Invalid role"):
        append_message(
            db_session,
            session_id=session.session_id,
            role="manager",
            message_type="question",
            content_text="Why did it drop?",
        )


def test_append_message_updates_last_agent_timestamp_and_updated_at(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )
    original_updated_at = session.updated_at

    time.sleep(0.01)
    message = append_message(
        db_session,
        session_id=session.session_id,
        role="assistant",
        message_type="answer",
        content_text="Sales dropped because lunch traffic was down.",
    )

    db_session.refresh(session)

    assert message.session_id == session.session_id
    assert session.last_agent_message_at is not None
    assert session.updated_at > original_updated_at


def test_append_message_does_not_commit_transaction(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )

    message = append_message(
        db_session,
        session_id=session.session_id,
        role="system",
        message_type="note",
        content_text="Session initialized.",
    )

    db_session.rollback()

    assert db_session.get(AgentSession, session.session_id) is None
    assert db_session.get(type(message), message.message_id) is None


def test_list_sessions_orders_by_latest_activity(db_session):
    first = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="First question",
    )
    second = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="Second question",
    )

    time.sleep(0.01)
    append_message(
        db_session,
        session_id=first.session_id,
        role="assistant",
        message_type="answer",
        content_text="Following up on the first question.",
    )

    sessions = list_sessions(db_session, store_id="store-a")

    assert [item.session_id for item in sessions][:2] == [first.session_id, second.session_id]
