from sqlalchemy import Enum as SqlEnum

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import (
    CardStatus,
    DiagnosisType,
    GraphStage,
    ReviewResolution,
    ReviewType,
    TaskStatus,
)


def test_core_tables_registered():
    table_names = set(Base.metadata.tables)
    expected = {
        "brands",
        "brand_file_templates",
        "brand_rule_bundles",
        "diagnosis_batches",
        "diagnosis_tasks",
        "task_results",
        "human_review_records",
        "result_cards",
        "card_evidences",
        "card_actions",
        "system_alerts",
        "audit_logs",
    }

    assert expected.issubset(table_names)


def test_core_state_columns_use_shared_enums():
    diagnosis_batches = Base.metadata.tables["diagnosis_batches"].c
    diagnosis_tasks = Base.metadata.tables["diagnosis_tasks"].c
    human_review_records = Base.metadata.tables["human_review_records"].c
    result_cards = Base.metadata.tables["result_cards"].c
    card_actions = Base.metadata.tables["card_actions"].c

    assert isinstance(diagnosis_batches.diagnosis_type.type, SqlEnum)
    assert diagnosis_batches.diagnosis_type.type.enum_class is DiagnosisType
    assert diagnosis_batches.status.type.enum_class is TaskStatus

    assert diagnosis_tasks.diagnosis_type.type.enum_class is DiagnosisType
    assert diagnosis_tasks.task_status.type.enum_class is TaskStatus
    assert diagnosis_tasks.graph_stage.type.enum_class is GraphStage

    assert human_review_records.review_type.type.enum_class is ReviewType
    assert human_review_records.resolution.type.enum_class is ReviewResolution

    assert result_cards.status.type.enum_class is CardStatus
    assert card_actions.from_status.type.enum_class is CardStatus
    assert card_actions.to_status.type.enum_class is CardStatus


def test_core_timestamps_are_timezone_aware():
    timestamp_columns = (
        Base.metadata.tables["brands"].c.created_at,
        Base.metadata.tables["brand_rule_bundles"].c.created_at,
        Base.metadata.tables["diagnosis_batches"].c.created_at,
        Base.metadata.tables["diagnosis_tasks"].c.created_at,
        Base.metadata.tables["task_results"].c.created_at,
        Base.metadata.tables["human_review_records"].c.reviewed_at,
        Base.metadata.tables["card_actions"].c.action_at,
        Base.metadata.tables["system_alerts"].c.created_at,
        Base.metadata.tables["audit_logs"].c.created_at,
    )

    assert all(column.type.timezone for column in timestamp_columns)
