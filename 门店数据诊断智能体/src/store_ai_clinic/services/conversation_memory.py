from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from store_ai_clinic.models.conversations import AgentMessage, SessionMemorySnapshot

ROLLING_SNAPSHOT_MESSAGE_THRESHOLD = 6
ROLLING_SNAPSHOT_CHAR_THRESHOLD = 240


@dataclass(frozen=True, slots=True)
class SnapshotWindow:
    coverage_message_start_id: str | None
    coverage_message_end_id: str | None
    message_count: int


def should_create_rolling_snapshot(
    *,
    unsummarized_message_count: int,
    latest_user_message_chars: int,
) -> bool:
    return (
        unsummarized_message_count >= ROLLING_SNAPSHOT_MESSAGE_THRESHOLD
        or latest_user_message_chars >= ROLLING_SNAPSHOT_CHAR_THRESHOLD
    )


def build_snapshot_summary_payload(
    *,
    session_id: str,
    messages: list[dict[str, object]],
    existing_summary: str | None = None,
) -> dict[str, object]:
    window = _build_snapshot_window(messages)
    transcript_lines = [
        f"{str(message.get('role', 'unknown'))}: {str(message.get('content_text', '')).strip()}"
        for message in messages
    ]
    return {
        "session_id": session_id,
        "existing_summary": existing_summary or "",
        "message_count": window.message_count,
        "coverage_message_start_id": window.coverage_message_start_id,
        "coverage_message_end_id": window.coverage_message_end_id,
        "transcript_text": "\n".join(line for line in transcript_lines if line.strip()),
    }


def list_unsummarized_messages(
    db: Session,
    *,
    session_id: str,
    limit: int = 12,
) -> list[AgentMessage]:
    latest_snapshot = get_latest_snapshot(db, session_id=session_id)
    covered_end_id = latest_snapshot.coverage_message_end_id if latest_snapshot else None

    stmt = (
        select(AgentMessage)
        .where(AgentMessage.session_id == session_id)
        .order_by(AgentMessage.created_at.asc())
    )
    messages = list(db.scalars(stmt))

    if not covered_end_id:
        return messages[:limit]

    for index, message in enumerate(messages):
        if message.message_id == covered_end_id:
            return messages[index + 1 : index + 1 + limit]

    return messages[:limit]


def get_latest_snapshot(db: Session, *, session_id: str) -> SessionMemorySnapshot | None:
    stmt = (
        select(SessionMemorySnapshot)
        .where(SessionMemorySnapshot.session_id == session_id)
        .order_by(SessionMemorySnapshot.created_at.desc())
        .limit(1)
    )
    return db.scalar(stmt)


def create_snapshot(
    db: Session,
    *,
    session_id: str,
    summary_text: str,
    summary_json: dict | None,
    coverage_message_start_id: str | None,
    coverage_message_end_id: str | None,
    compression_level: str = "rolling",
) -> SessionMemorySnapshot:
    snapshot = SessionMemorySnapshot(
        snapshot_id=str(uuid4()),
        session_id=session_id,
        summary_text=summary_text,
        summary_json=summary_json or {},
        coverage_message_start_id=coverage_message_start_id,
        coverage_message_end_id=coverage_message_end_id,
        compression_level=compression_level,
    )
    db.add(snapshot)
    db.flush()
    db.refresh(snapshot)
    return snapshot


def _build_snapshot_window(messages: list[dict[str, object]]) -> SnapshotWindow:
    start_id = str(messages[0]["message_id"]) if messages else None
    end_id = str(messages[-1]["message_id"]) if messages else None
    return SnapshotWindow(
        coverage_message_start_id=start_id,
        coverage_message_end_id=end_id,
        message_count=len(messages),
    )
