from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import ReviewResolution, ReviewType, enum_column


class HumanReviewRecord(Base):
    __tablename__ = "human_review_records"

    review_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        ForeignKey("diagnosis_tasks.task_id"),
        nullable=False,
        index=True,
    )
    review_type: Mapped[ReviewType] = mapped_column(enum_column(ReviewType), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    action_hint: Mapped[str] = mapped_column(Text, nullable=False)
    reviewed_by: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution: Mapped[ReviewResolution | None] = mapped_column(enum_column(ReviewResolution), nullable=True)
    before_after_diff_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    critical_snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    remark: Mapped[str | None] = mapped_column(Text)
