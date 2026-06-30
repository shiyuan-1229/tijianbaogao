from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import CardStatus, enum_column, utc_now


class ResultCard(Base):
    __tablename__ = "result_cards"

    card_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        ForeignKey("diagnosis_tasks.task_id"),
        nullable=False,
        index=True,
    )
    card_type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str | None] = mapped_column(String(30))
    confidence: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[CardStatus] = mapped_column(
        enum_column(CardStatus),
        nullable=False,
        default=CardStatus.NEW,
    )
    action_suggestions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


class CardEvidence(Base):
    __tablename__ = "card_evidences"

    evidence_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    card_id: Mapped[str] = mapped_column(
        ForeignKey("result_cards.card_id"),
        nullable=False,
        index=True,
    )
    metric_name: Mapped[str] = mapped_column(String(120), nullable=False)
    metric_value: Mapped[str | None] = mapped_column(String(120))
    baseline_value: Mapped[str | None] = mapped_column(String(120))
    diff_rate: Mapped[str | None] = mapped_column(String(60))
    signal_type: Mapped[str | None] = mapped_column(String(40))
    explanation: Mapped[str] = mapped_column(Text, nullable=False)


class CardAction(Base):
    __tablename__ = "card_actions"

    action_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    card_id: Mapped[str] = mapped_column(
        ForeignKey("result_cards.card_id"),
        nullable=False,
        index=True,
    )
    action_by: Mapped[str | None] = mapped_column(String(120))
    action_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    from_status: Mapped[CardStatus] = mapped_column(enum_column(CardStatus), nullable=False)
    to_status: Mapped[CardStatus] = mapped_column(enum_column(CardStatus), nullable=False)
    comment_text: Mapped[str | None] = mapped_column(Text)
    image_urls: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
