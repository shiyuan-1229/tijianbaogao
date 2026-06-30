from store_ai_clinic.models.knowledge import KnowledgeChunk


def build_text_chunks(
    *,
    source_id: str,
    content_text: str | None = None,
    page_texts: list[tuple[int, str]] | None = None,
) -> list[KnowledgeChunk]:
    chunks: list[KnowledgeChunk] = []
    chunk_no = 1

    if page_texts is not None:
        for page_no, page_text in page_texts:
            lines = [line.strip() for line in page_text.splitlines() if line.strip()]
            for line in lines:
                chunks.append(
                    KnowledgeChunk(
                        chunk_id=f"{source_id}_chunk_{chunk_no}",
                        source_id=source_id,
                        chunk_no=chunk_no,
                        page_no=page_no,
                        chapter_title=None,
                        section_title=None,
                        chunk_text=line,
                        summary_text=line[:120],
                        quote_text=line[:200],
                    )
                )
                chunk_no += 1

        return chunks

    normalized_text = content_text or ""
    lines = [line.strip() for line in normalized_text.splitlines() if line.strip()]
    if not lines and normalized_text.strip():
        lines = [normalized_text.strip()]

    for line in lines:
        chunks.append(
            KnowledgeChunk(
                chunk_id=f"{source_id}_chunk_{chunk_no}",
                source_id=source_id,
                chunk_no=chunk_no,
                page_no=1,
                chapter_title=None,
                section_title=None,
                chunk_text=line,
                summary_text=line[:120],
                quote_text=line[:200],
            )
        )
        chunk_no += 1

    return chunks
