from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import DiagnosisType, GraphStage, TaskStatus, enum_column, utc_now


class DiagnosisBatch(Base):
    __tablename__ = "diagnosis_batches"

    batch_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(
        ForeignKey("brands.brand_id"),
        nullable=False,
        index=True,
    )
    diagnosis_type: Mapped[DiagnosisType] = mapped_column(enum_column(DiagnosisType), nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        enum_column(TaskStatus),
        nullable=False,
        default=TaskStatus.QUEUED,
    )
    file_summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    store_task_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class DiagnosisTask(Base):
    __tablename__ = "diagnosis_tasks"

    task_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    batch_id: Mapped[str] = mapped_column(
        ForeignKey("diagnosis_batches.batch_id"),
        nullable=False,
        index=True,
    )
    brand_id: Mapped[str] = mapped_column(
        ForeignKey("brands.brand_id"),
        nullable=False,
        index=True,
    )
    store_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    diagnosis_type: Mapped[DiagnosisType] = mapped_column(enum_column(DiagnosisType), nullable=False)
    task_status: Mapped[TaskStatus] = mapped_column(
        enum_column(TaskStatus),
        nullable=False,
        default=TaskStatus.QUEUED,
    )
    graph_stage: Mapped[GraphStage] = mapped_column(
        enum_column(GraphStage),
        nullable=False,
        default=GraphStage.INGEST,
    )
    checkpoint_thread_id: Mapped[str | None] = mapped_column(String(64))
    human_wait_type: Mapped[str | None] = mapped_column(String(40))
    human_wait_reason: Mapped[str | None] = mapped_column(String(255))
    human_wait_action_hint: Mapped[str | None] = mapped_column(Text)
    result_version_group_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class TaskResult(Base):
    __tablename__ = "task_results"

    result_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        ForeignKey("diagnosis_tasks.task_id"),
        nullable=False,
        index=True,
    )
    result_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    summary_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    report_markdown: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
