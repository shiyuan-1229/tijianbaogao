from datetime import date
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from store_ai_clinic.models.conversations import DiagnosisMemoryCard


def create_diagnosis_memory_card(
    db: Session,
    *,
    brand_id: str,
    store_id: str,
    diagnosis_type: str,
    title: str,
    summary: str,
    root_cause_brief: str | None = None,
    next_action_brief: str | None = None,
    session_id: str | None = None,
    source_task_id: str | None = None,
    source_result_id: str | None = None,
    biz_date_start: date | None = None,
    biz_date_end: date | None = None,
    tags_json: dict | None = None,
    importance_score: float = 0.0,
) -> DiagnosisMemoryCard:
    card = DiagnosisMemoryCard(
        memory_id=str(uuid4()),
        source_task_id=source_task_id,
        source_result_id=source_result_id,
        session_id=session_id,
        brand_id=brand_id,
        store_id=store_id,
        diagnosis_type=diagnosis_type,
        biz_date_start=biz_date_start,
        biz_date_end=biz_date_end,
        title=title,
        summary=summary,
        root_cause_brief=root_cause_brief,
        next_action_brief=next_action_brief,
        tags_json=tags_json or {},
        importance_score=importance_score,
    )
    db.add(card)
    db.flush()
    db.refresh(card)
    return card


def list_recent_diagnosis_memories(
    db: Session,
    *,
    store_id: str,
    limit: int = 5,
) -> list[DiagnosisMemoryCard]:
    stmt = (
        select(DiagnosisMemoryCard)
        .where(DiagnosisMemoryCard.store_id == store_id)
        .order_by(DiagnosisMemoryCard.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))
