from dataclasses import dataclass, field

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from store_ai_clinic.models.knowledge import KnowledgeChunk, KnowledgeSource
from store_ai_clinic.services.knowledge_publication import can_retrieve_source


@dataclass(frozen=True, slots=True)
class KnowledgeCitation:
    source_id: str
    source_title: str
    knowledge_type: str
    page_no: int | None
    chapter_title: str | None
    quote_text: str
    version_label: str | None


@dataclass(frozen=True, slots=True)
class KnowledgeRetrievalResult:
    query_text: str
    citations: list[KnowledgeCitation] = field(default_factory=list)
    evidence_summary: str = ""


def build_empty_retrieval_result(*, query_text: str) -> KnowledgeRetrievalResult:
    return KnowledgeRetrievalResult(query_text=query_text)


def retrieve_published_knowledge(
    db: Session,
    *,
    query_text: str,
    session_id: str,
    store_id: str,
    limit: int = 3,
) -> KnowledgeRetrievalResult:
    del session_id, store_id

    chunk_rows = list(
        db.execute(_build_published_chunk_stmt(limit=limit)).all()
    )
    citations = [
        KnowledgeCitation(
            source_id=source.source_id,
            source_title=source.source_title,
            knowledge_type=source.knowledge_type,
            page_no=chunk.page_no,
            chapter_title=chunk.chapter_title,
            quote_text=chunk.quote_text or chunk.chunk_text,
            version_label=source.version_label,
        )
        for chunk, source in chunk_rows
        if can_retrieve_source(source.status)
    ]

    if not citations:
        return build_empty_retrieval_result(query_text=query_text)

    return KnowledgeRetrievalResult(
        query_text=query_text,
        citations=citations,
        evidence_summary=f"已引用 {len(citations)} 条知识库依据",
    )


def _build_published_chunk_stmt(
    *,
    limit: int,
) -> Select[tuple[KnowledgeChunk, KnowledgeSource]]:
    return (
        select(KnowledgeChunk, KnowledgeSource)
        .join(KnowledgeSource, KnowledgeChunk.source_id == KnowledgeSource.source_id)
        .where(KnowledgeSource.status == "published")
        .order_by(KnowledgeSource.updated_at.desc(), KnowledgeChunk.chunk_no.asc())
        .limit(limit)
    )
