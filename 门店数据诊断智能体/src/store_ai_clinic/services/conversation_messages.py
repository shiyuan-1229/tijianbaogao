from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from store_ai_clinic.models.conversations import AgentMessage, AgentSession
from store_ai_clinic.models.enums import utc_now
from store_ai_clinic.services.conversation_sessions import (
    DEFAULT_SESSION_TITLE,
    TITLE_SOURCE_SYSTEM,
    build_session_title,
)

VALID_MESSAGE_ROLES = {"user", "assistant", "system", "tool"}


def append_message(
    db: Session,
    *,
    session_id: str,
    role: str,
    message_type: str,
    content_text: str,
    content_json: dict | None = None,
    intent_label: str | None = None,
) -> AgentMessage:
    if role not in VALID_MESSAGE_ROLES:
        valid_roles = ", ".join(sorted(VALID_MESSAGE_ROLES))
        raise ValueError(f"Invalid role: {role}. Expected one of: {valid_roles}")

    session = db.get(AgentSession, session_id)
    if session is None:
        raise ValueError(f"Unknown session_id: {session_id}")

    message = AgentMessage(
        message_id=str(uuid4()),
        session_id=session_id,
        role=role,
        message_type=message_type,
        content_text=content_text,
        content_json=content_json,
        intent_label=intent_label,
    )
    db.add(message)

    now = utc_now()
    session.updated_at = now
    if role == "user":
        if session.title_source == TITLE_SOURCE_SYSTEM and session.session_title == DEFAULT_SESSION_TITLE:
            session.session_title = build_session_title(content_text or "")
        session.last_user_message_at = now
    elif role == "assistant":
        session.last_agent_message_at = now

    db.flush()
    db.refresh(message)
    return message


def list_messages(db: Session, *, session_id: str) -> list[AgentMessage]:
    stmt = (
        select(AgentMessage)
        .where(AgentMessage.session_id == session_id)
        .order_by(AgentMessage.created_at.asc())
    )
    return list(db.scalars(stmt))
