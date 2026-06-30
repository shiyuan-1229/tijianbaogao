from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.knowledge import KnowledgeChunk, KnowledgeSource
from store_ai_clinic.services.knowledge_retrieval import (
    build_empty_retrieval_result,
    retrieve_published_knowledge,
)


def test_empty_retrieval_result_has_no_citations():
    result = build_empty_retrieval_result(query_text="客诉率上升")

    assert result.query_text == "客诉率上升"
    assert result.citations == []
    assert result.evidence_summary == ""


def test_retrieve_published_knowledge_returns_only_published_citations():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with session_factory() as db:
        published_source = KnowledgeSource(
            source_id="src-published",
            source_title="门店客诉处理规范",
            knowledge_type="sop",
            status="published",
            version_label="V3",
            file_name="complaint-sop.pdf",
            file_path="/tmp/complaint-sop.pdf",
            mime_type="application/pdf",
        )
        draft_source = KnowledgeSource(
            source_id="src-draft",
            source_title="客诉处理草稿",
            knowledge_type="sop",
            status="draft",
            version_label="V4-draft",
            file_name="complaint-sop-draft.pdf",
            file_path="/tmp/complaint-sop-draft.pdf",
            mime_type="application/pdf",
        )
        db.add_all([published_source, draft_source])
        db.add_all(
            [
                KnowledgeChunk(
                    chunk_id="chunk-published",
                    source_id="src-published",
                    chunk_no=1,
                    page_no=24,
                    chapter_title="客诉升级处理",
                    section_title="首响要求",
                    chunk_text="门店在收到客诉后，应在30分钟内完成首次响应，并形成闭环记录。",
                    summary_text="客诉首响必须在30分钟内完成。",
                    quote_text="门店在收到客诉后，应在30分钟内完成首次响应。",
                ),
                KnowledgeChunk(
                    chunk_id="chunk-draft",
                    source_id="src-draft",
                    chunk_no=1,
                    page_no=3,
                    chapter_title="草稿",
                    section_title="草稿要求",
                    chunk_text="这是一份尚未发布的客诉草稿，不应被检索。",
                    summary_text="未发布草稿不得用于回答。",
                    quote_text="这是一份尚未发布的客诉草稿，不应被检索。",
                ),
            ]
        )
        db.commit()

        result = retrieve_published_knowledge(
            db,
            query_text="客诉率上升",
            session_id="ses_001",
            store_id="store-a",
        )

    assert result.query_text == "客诉率上升"
    assert result.evidence_summary == "已引用 1 条知识库依据"
    assert len(result.citations) == 1
    assert result.citations[0].source_id == "src-published"
    assert result.citations[0].source_title == "门店客诉处理规范"
    assert result.citations[0].page_no == 24
