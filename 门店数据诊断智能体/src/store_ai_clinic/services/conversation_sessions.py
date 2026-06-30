import re
from uuid import uuid4

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from store_ai_clinic.models.conversations import (
    AgentMessage,
    AgentSession,
    DiagnosisMemoryCard,
    FollowupSuggestion,
    MessageDiagnosisLink,
    SessionMemorySnapshot,
    TITLE_SOURCE_SYSTEM,
    TITLE_SOURCE_USER,
)

DEFAULT_SESSION_TITLE = "新诊断会话"
TITLE_MAX_LENGTH = 20
MULTI_STORE_COMPARISON_TITLE = "门店经营对比分析"
STORE_PATTERN = re.compile(r"([\u4e00-\u9fffA-Za-z0-9]+店)")


def _truncate_title(value: str) -> str:
    return value[:TITLE_MAX_LENGTH].strip()


def _extract_store_name(question: str) -> str | None:
    cleaned = question
    if cleaned.startswith("分析"):
        cleaned = cleaned[2:]
    match = STORE_PATTERN.search(cleaned)
    if not match:
        return None
    return match.group(1)


def build_session_title(question: str) -> str:
    normalized = " ".join(question.split())
    if not normalized:
        return DEFAULT_SESSION_TITLE

    if "门店" in normalized and ("比较" in normalized or "对比" in normalized):
        return MULTI_STORE_COMPARISON_TITLE
    if ("比较" in normalized or "对比" in normalized) and normalized.count("店") >= 2:
        return MULTI_STORE_COMPARISON_TITLE

    store_name = _extract_store_name(normalized)
    if "日报" in normalized and store_name:
        return _truncate_title(f"{store_name}日报诊断") or DEFAULT_SESSION_TITLE
    if "周报" in normalized and store_name:
        return _truncate_title(f"{store_name}周报诊断") or DEFAULT_SESSION_TITLE

    return _truncate_title(normalized) or DEFAULT_SESSION_TITLE


def create_session(
    db: Session,
    *,
    brand_id: str,
    store_id: str,
    entry_mode: str,
    initial_question: str,
    diagnosis_type_hint: str | None = None,
) -> AgentSession:
    normalized_question = initial_question.strip()
    session = AgentSession(
        session_id=str(uuid4()),
        brand_id=brand_id,
        store_id=store_id,
        session_title=build_session_title(normalized_question),
        title_source=TITLE_SOURCE_SYSTEM,
        entry_mode=entry_mode,
        status="active",
        diagnosis_type_hint=diagnosis_type_hint,
    )
    db.add(session)
    db.flush()
    db.refresh(session)
    return session


def list_sessions(db: Session, *, store_id: str | None = None) -> list[AgentSession]:
    stmt = select(AgentSession).order_by(AgentSession.updated_at.desc())
    if store_id:
        stmt = stmt.where(AgentSession.store_id == store_id)
    return list(db.scalars(stmt))


def get_session(db: Session, *, session_id: str) -> AgentSession | None:
    return db.get(AgentSession, session_id)


def rename_session(db: Session, *, session_id: str, session_title: str) -> AgentSession:
    session = db.get(AgentSession, session_id)
    if session is None:
        raise ValueError(f"Unknown session_id: {session_id}")

    title = session_title.strip()
    if not title:
        raise ValueError("session_title must not be empty")

    session.session_title = _truncate_title(title)
    session.title_source = TITLE_SOURCE_USER
    db.flush()
    db.refresh(session)
    return session


def delete_session(db: Session, *, session_id: str) -> bool:
    session = db.get(AgentSession, session_id)
    if session is None:
        return False

    db.execute(
        update(DiagnosisMemoryCard)
        .where(DiagnosisMemoryCard.session_id == session_id)
        .values(session_id=None)
    )
    db.execute(delete(SessionMemorySnapshot).where(SessionMemorySnapshot.session_id == session_id))
    db.execute(delete(FollowupSuggestion).where(FollowupSuggestion.session_id == session_id))
    db.execute(delete(MessageDiagnosisLink).where(MessageDiagnosisLink.session_id == session_id))
    db.execute(delete(AgentMessage).where(AgentMessage.session_id == session_id))
    db.delete(session)
    db.flush()
    return True
