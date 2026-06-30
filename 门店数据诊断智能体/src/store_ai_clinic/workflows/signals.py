from dataclasses import dataclass

PAUSE_TYPE_DATA_QUALITY_REVIEW = "data_quality_review"
PAUSE_REASON_INCONSISTENT_COLUMNS = "Detected inconsistent column values"
PAUSE_ACTION_HINT_REVIEW_CORRECTION = "Review sample rows and choose a correction"


@dataclass(frozen=True, slots=True)
class PauseSignal:
    pause_type: str
    reason: str
    action_hint: str
