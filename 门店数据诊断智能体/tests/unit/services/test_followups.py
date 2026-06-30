from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.conversations import AgentMessage
from store_ai_clinic.services.conversation_sessions import create_session
from store_ai_clinic.services.followups import generate_followup_suggestions
from store_ai_clinic.services.orchestrator import run_orchestrator_turn


def test_generate_followup_suggestions_for_pre_diagnosis_stage():
    suggestions = generate_followup_suggestions(stage="pre_diagnosis")

    assert len(suggestions) == 3
    assert all(item.suggestion_type == "diagnosis_prompt" for item in suggestions)
    assert suggestions[0].text


def test_generate_followup_suggestions_for_post_diagnosis_stage():
    suggestions = generate_followup_suggestions(stage="post_diagnosis")

    assert 2 <= len(suggestions) <= 3
    assert {item.suggestion_type for item in suggestions} <= {
        "why_followup",
        "time_drilldown",
        "action_plan",
        "session_summary",
        "same_store_compare",
    }


def test_generate_followup_suggestions_deduplicates_and_limits_results():
    suggestions = generate_followup_suggestions(
        stage="post_diagnosis",
        preferred_intents=[
            "action_plan",
            "action_plan",
            "session_summary",
            "same_store_compare",
            "why_followup",
        ],
    )

    assert [item.intent for item in suggestions] == [
        "action_plan",
        "session_summary",
        "same_store_compare",
    ]


def test_orchestrator_uses_post_diagnosis_suggestions_when_context_already_exists():
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
            initial_question="Review the store performance first",
        )

        result = run_orchestrator_turn(
            db_session,
            session_id=session.session_id,
            store_id="store-a",
            user_message_text="Why did this happen?",
            diagnosis_runner=lambda **_: {
                "diagnosis_draft": {
                    "title": "unused",
                    "summary": "unused",
                    "next_action": "unused",
                }
            },
            has_diagnosis_context=True,
        )

        assert result.intent == "why_followup"
        assert result.diagnosis_result is None
        assert all(item.suggestion_type != "diagnosis_prompt" for item in result.suggestions)
    finally:
        db_session.close()
        Base.metadata.drop_all(engine)


def test_orchestrator_initial_diagnosis_success_appends_messages_and_returns_post_stage():
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
            initial_question="Review today's store data",
        )
        captured: dict[str, object] = {}

        def diagnosis_runner(**kwargs):
            captured.update(kwargs)
            return {
                "diagnosis_error": None,
                "diagnosis_draft": {
                    "title": "Lunch-hour traffic is weak",
                    "summary": "Orders dropped the most from 12:00 to 14:00.",
                    "next_action": "Check staffing and in-store conversion first.",
                },
            }

        result = run_orchestrator_turn(
            db_session,
            session_id=session.session_id,
            store_id="store-a",
            user_message_text="Please diagnose today's store performance",
            diagnosis_runner=diagnosis_runner,
            diagnosis_task_factory=lambda: {
                "task_id": "task-001",
                "diagnosis_type": "daily",
            },
            has_diagnosis_context=False,
        )

        messages = list(
            db_session.scalars(
                select(AgentMessage)
                .where(AgentMessage.session_id == session.session_id)
                .order_by(AgentMessage.created_at.asc())
            )
        )

        assert captured["task_id"] == "task-001"
        assert captured["session_id"] == session.session_id
        assert captured["analysis_mode"] == "conversation"
        assert captured["trigger_reason"] == "initial_diagnosis"
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[0].content_text == "Please diagnose today's store performance"
        assert messages[1].role == "assistant"
        assert "Lunch-hour traffic is weak" in (messages[1].content_text or "")
        assert result.diagnosis_result is not None
        assert all(item.suggestion_type != "diagnosis_prompt" for item in result.suggestions)

    finally:
        db_session.close()
        Base.metadata.drop_all(engine)


def test_orchestrator_failed_initial_diagnosis_falls_back_without_misleading_success_copy():
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
            initial_question="Review today's store data",
        )

        result = run_orchestrator_turn(
            db_session,
            session_id=session.session_id,
            store_id="store-a",
            user_message_text="Please diagnose today's store performance",
            diagnosis_runner=lambda **_: {
                "diagnosis_error": "model timeout",
                "diagnosis_draft": None,
            },
            has_diagnosis_context=False,
        )

        assert result.diagnosis_result == {
            "diagnosis_error": "model timeout",
            "diagnosis_draft": None,
        }
        assert "Check staffing" not in result.answer_text
        assert "next step" not in result.answer_text.lower()
        assert all(item.suggestion_type == "diagnosis_prompt" for item in result.suggestions)
    finally:
        db_session.close()
        Base.metadata.drop_all(engine)


def test_orchestrator_session_summary_fallback_reply_is_chinese():
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
            initial_question="先看今天的门店表现",
        )

        result = run_orchestrator_turn(
            db_session,
            session_id=session.session_id,
            store_id="store-a",
            user_message_text="帮我总结一下这次结论",
            diagnosis_runner=lambda **_: {
                "diagnosis_draft": {
                    "title": "unused",
                    "summary": "unused",
                    "next_action": "unused",
                }
            },
            has_diagnosis_context=True,
        )

        assert result.intent == "session_summary"
        assert result.answer_text == "我可以把这一轮整理成简短总结，方便交接或归档。"
    finally:
        db_session.close()
        Base.metadata.drop_all(engine)


def test_orchestrator_why_followup_fallback_reply_is_chinese():
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
            initial_question="先看今天这家店的整体表现",
        )

        result = run_orchestrator_turn(
            db_session,
            session_id=session.session_id,
            store_id="store-a",
            user_message_text="为什么会这样？",
            diagnosis_runner=lambda **_: {
                "diagnosis_draft": {
                    "title": "unused",
                    "summary": "unused",
                    "next_action": "unused",
                }
            },
            has_diagnosis_context=True,
        )

        assert result.intent == "why_followup"
        assert result.answer_text == "我会继续拆解这次结果背后的主要原因，先把最可能的驱动因素讲清楚。"
    finally:
        db_session.close()
        Base.metadata.drop_all(engine)


def test_orchestrator_normalizes_english_diagnosis_next_action_to_chinese():
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
            initial_question="Review today's store data",
        )

        result = run_orchestrator_turn(
            db_session,
            session_id=session.session_id,
            store_id="store-a",
            user_message_text="Please diagnose today's store performance",
            diagnosis_runner=lambda **_: {
                "diagnosis_error": None,
                "diagnosis_draft": {
                    "title": "门店日常诊断报告",
                    "summary": "门店运营状态正常，无明显异常指标。",
                    "next_action": "Suggested next step: Check the daily sales report and traffic trend.",
                },
            },
            has_diagnosis_context=False,
        )

        assert "Suggested next step" not in result.answer_text
        assert result.answer_text.endswith("建议下一步：请检查当日销售报表与客流趋势。")
    finally:
        db_session.close()
        Base.metadata.drop_all(engine)


def test_orchestrator_normalizes_mixed_language_next_action_prefix_to_chinese():
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
            initial_question="Review today's store data",
        )

        result = run_orchestrator_turn(
            db_session,
            session_id=session.session_id,
            store_id="store-a",
            user_message_text="Please diagnose today's store performance",
            diagnosis_runner=lambda **_: {
                "diagnosis_error": None,
                "diagnosis_draft": {
                    "title": "门店日常经营诊断",
                    "summary": "门店经营状况正常，无明显异常指标。",
                    "next_action": "Suggested next step: 继续监控日常运营数据，重点关注客流与销售额变化。",
                },
            },
            has_diagnosis_context=False,
        )

        assert "Suggested next step" not in result.answer_text
        assert result.answer_text.endswith("建议下一步：继续监控日常运营数据，重点关注客流与销售额变化。")
    finally:
        db_session.close()
        Base.metadata.drop_all(engine)
