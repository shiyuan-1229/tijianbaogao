from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from store_ai_clinic.db.base import Base
from store_ai_clinic.services.conversation_memory import (
    build_snapshot_summary_payload,
    create_snapshot,
    list_unsummarized_messages,
    should_create_rolling_snapshot,
)
from store_ai_clinic.services.conversation_messages import append_message
from store_ai_clinic.services.conversation_sessions import create_session


def test_should_create_rolling_snapshot_when_threshold_is_reached():
    assert (
        should_create_rolling_snapshot(
            unsummarized_message_count=6,
            latest_user_message_chars=20,
        )
        is True
    )


def test_should_create_rolling_snapshot_when_latest_message_is_long():
    assert (
        should_create_rolling_snapshot(
            unsummarized_message_count=2,
            latest_user_message_chars=280,
        )
        is True
    )


def test_should_not_create_rolling_snapshot_for_small_incremental_turn():
    assert (
        should_create_rolling_snapshot(
            unsummarized_message_count=2,
            latest_user_message_chars=60,
        )
        is False
    )


def test_build_snapshot_summary_payload_captures_latest_window():
    payload = build_snapshot_summary_payload(
        session_id="session-001",
        messages=[
            {"message_id": "m1", "role": "user", "content_text": "Start with the store overview"},
            {"message_id": "m2", "role": "assistant", "content_text": "Lunch-hour GMV fell the most"},
        ],
        existing_summary="Earlier summary: weekend traffic was soft",
    )

    assert payload["session_id"] == "session-001"
    assert payload["existing_summary"] == "Earlier summary: weekend traffic was soft"
    assert payload["message_count"] == 2
    assert payload["coverage_message_start_id"] == "m1"
    assert payload["coverage_message_end_id"] == "m2"


def test_list_unsummarized_messages_returns_messages_after_latest_snapshot_coverage():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db_session = session_factory()

    try:
        session = create_session(
            db_session,
            brand_id="brand-acme",
            store_id="store-a",
            entry_mode="manual",
            initial_question="Start with the store overview",
        )
        first = append_message(
            db_session,
            session_id=session.session_id,
            role="user",
            message_type="question",
            content_text="First round question",
        )
        second = append_message(
            db_session,
            session_id=session.session_id,
            role="assistant",
            message_type="answer",
            content_text="First round answer",
        )
        third = append_message(
            db_session,
            session_id=session.session_id,
            role="user",
            message_type="question",
            content_text="Second round follow-up",
        )
        fourth = append_message(
            db_session,
            session_id=session.session_id,
            role="assistant",
            message_type="answer",
            content_text="Second round answer",
        )

        create_snapshot(
            db_session,
            session_id=session.session_id,
            summary_text="Summarized the first two messages",
            summary_json={"summary": "done"},
            coverage_message_start_id=first.message_id,
            coverage_message_end_id=second.message_id,
        )

        messages = list_unsummarized_messages(
            db_session,
            session_id=session.session_id,
            limit=10,
        )

        assert [message.message_id for message in messages] == [
            third.message_id,
            fourth.message_id,
        ]
    finally:
        db_session.close()
        Base.metadata.drop_all(engine)
