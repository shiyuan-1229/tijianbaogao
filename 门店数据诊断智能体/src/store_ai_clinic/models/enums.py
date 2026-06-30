from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import Enum as SqlEnum

try:
    from enum import StrEnum
except ImportError:
    class StrEnum(str, Enum):
        """Python 3.10 compatibility shim for Python 3.12 StrEnum."""


class DiagnosisType(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"


class TaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_HUMAN = "waiting_human"
    COMPLETED = "completed"
    FAILED = "failed"


class GraphStage(StrEnum):
    INGEST = "ingest"
    CLEAN = "clean"
    CLEAN_VALIDATE = "clean_validate"
    METRICS = "metrics"
    METRICS_VALIDATE = "metrics_validate"
    DIAGNOSE = "diagnose"
    DIAGNOSIS_VALIDATE = "diagnosis_validate"
    REPORT = "report"


class ReviewType(StrEnum):
    FIELD_MAPPING = "field_mapping_review"
    DATA_QUALITY = "data_quality_review"
    DIAGNOSIS = "diagnosis_review"


class ReviewResolution(StrEnum):
    APPROVED = "approved"
    UPDATED = "updated"
    REJECTED = "rejected"


class CardStatus(StrEnum):
    NEW = "new"
    PENDING_REVIEW = "pending_review"
    PROCESSING = "processing"
    COMPLETED = "completed"
    IGNORED = "ignored"
    ESCALATED = "escalated"


def enum_column(enum_class: type[Enum], **kwargs: Any) -> SqlEnum:
    return SqlEnum(
        enum_class,
        values_callable=lambda members: [member.value for member in members],
        **kwargs,
    )


def utc_now() -> datetime:
    return datetime.now(UTC)
