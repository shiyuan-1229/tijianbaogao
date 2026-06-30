from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from pypdf import PdfReader

from store_ai_clinic.models.knowledge import KnowledgeSource
from store_ai_clinic.services.knowledge_chunking import build_text_chunks


def _extract_pdf_page_texts(content_bytes: bytes) -> tuple[list[tuple[int, str]], int]:
    reader = PdfReader(BytesIO(content_bytes))
    page_count = len(reader.pages)
    page_texts: list[tuple[int, str]] = []

    for page_index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            page_texts.append((page_index, text))

    return page_texts, page_count


def ingest_uploaded_text_source(
    *,
    source_title: str,
    knowledge_type: str,
    version_label: str | None,
    upload_file: UploadFile,
    storage_root: Path,
):
    source_id = f"src_{uuid4().hex[:12]}"
    suffix = (Path(upload_file.filename or "").suffix or ".txt").lower()
    mime_type = upload_file.content_type or "text/plain"
    storage_root.mkdir(parents=True, exist_ok=True)
    saved_path = storage_root / f"{source_id}{suffix}"

    content_bytes = upload_file.file.read()
    saved_path.write_bytes(content_bytes)

    if suffix == ".pdf" or mime_type == "application/pdf":
        page_texts, page_count = _extract_pdf_page_texts(content_bytes)
        chunks = build_text_chunks(source_id=source_id, page_texts=page_texts)
    else:
        content_text = content_bytes.decode("utf-8-sig")
        page_count = 1
        chunks = build_text_chunks(source_id=source_id, content_text=content_text)

    source = KnowledgeSource(
        source_id=source_id,
        source_title=source_title.strip(),
        knowledge_type=knowledge_type,
        status="pending_publish",
        version_label=version_label.strip() if version_label else None,
        file_name=upload_file.filename or f"{source_title.strip()}.txt",
        file_path=str(saved_path),
        mime_type=mime_type,
        page_count=page_count,
    )
    return source, chunks
