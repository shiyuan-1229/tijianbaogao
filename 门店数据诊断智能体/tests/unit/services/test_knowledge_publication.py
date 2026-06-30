from store_ai_clinic.models.knowledge import KnowledgeSource
from store_ai_clinic.services.knowledge_publication import (
    can_retrieve_source,
    publish_source,
)


def test_knowledge_source_status_defaults_to_draft():
    source = KnowledgeSource(
        source_id="src-1",
        source_title="门店客诉处理规范",
        knowledge_type="sop",
        file_name="投诉规范.pdf",
        file_path="/tmp/投诉规范.pdf",
        mime_type="application/pdf",
    )

    assert source.status == "draft"


def test_only_published_knowledge_is_retrievable():
    assert can_retrieve_source("published") is True
    assert can_retrieve_source("draft") is False
    assert can_retrieve_source("processing") is False
    assert can_retrieve_source("pending_publish") is False
    assert can_retrieve_source("archived") is False


def test_publish_source_marks_pending_source_as_published():
    source = KnowledgeSource(
        source_id="src-2",
        source_title="经营改善行动手册",
        knowledge_type="training",
        status="pending_publish",
        file_name="ops-playbook.pdf",
        file_path="/tmp/ops-playbook.pdf",
        mime_type="application/pdf",
    )

    publish_source(source)

    assert source.status == "published"
