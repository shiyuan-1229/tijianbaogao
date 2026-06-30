from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import DiagnosisType, enum_column, utc_now

TITLE_SOURCE_SYSTEM = "system"
TITLE_SOURCE_USER = "user"


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    session_title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_source: Mapped[str] = mapped_column(String(20), nullable=False, default=TITLE_SOURCE_SYSTEM)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    entry_mode: Mapped[str] = mapped_column(String(40), nullable=False)
    primary_topic: Mapped[str | None] = mapped_column(String(80))
    diagnosis_type_hint: Mapped[DiagnosisType | None] = mapped_column(enum_column(DiagnosisType))
    biz_date_start: Mapped[date | None] = mapped_column(Date)
    biz_date_end: Mapped[date | None] = mapped_column(Date)
    last_user_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_agent_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    message_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    message_type: Mapped[str] = mapped_column(String(40), nullable=False)
    content_text: Mapped[str | None] = mapped_column(Text)
    content_json: Mapped[dict | None] = mapped_column(JSON)
    reply_to_message_id: Mapped[str | None] = mapped_column(String(36))
    intent_label: Mapped[str | None] = mapped_column(String(40))
    tokens_estimate: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SessionMemorySnapshot(Base):
    __tablename__ = "session_memory_snapshots"

    snapshot_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    summary_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    coverage_message_start_id: Mapped[str | None] = mapped_column(String(36))
    coverage_message_end_id: Mapped[str | None] = mapped_column(String(36))
    compression_level: Mapped[str] = mapped_column(String(20), nullable=False, default="rolling")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class DiagnosisMemoryCard(Base):
    __tablename__ = "diagnosis_memory_cards"

    memory_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_task_id: Mapped[str | None] = mapped_column(ForeignKey("diagnosis_tasks.task_id"), index=True)
    source_result_id: Mapped[str | None] = mapped_column(ForeignKey("task_results.result_id"), index=True)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("agent_sessions.session_id"), index=True)
    brand_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    diagnosis_type: Mapped[str] = mapped_column(String(20), nullable=False)
    biz_date_start: Mapped[date | None] = mapped_column(Date)
    biz_date_end: Mapped[date | None] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause_brief: Mapped[str | None] = mapped_column(Text)
    next_action_brief: Mapped[str | None] = mapped_column(Text)
    tags_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    importance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class MessageDiagnosisLink(Base):
    __tablename__ = "message_diagnosis_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    message_id: Mapped[str] = mapped_column(ForeignKey("agent_messages.message_id"), nullable=False, index=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("diagnosis_tasks.task_id"), nullable=False, index=True)
    link_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class FollowupSuggestion(Base):
    __tablename__ = "followup_suggestions"

    suggestion_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    message_id: Mapped[str] = mapped_column(ForeignKey("agent_messages.message_id"), nullable=False, index=True)
    suggestion_text: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion_type: Mapped[str] = mapped_column(String(20), nullable=False)
    rank_order: Mapped[int] = mapped_column(Integer, nullable=False)
    accepted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
