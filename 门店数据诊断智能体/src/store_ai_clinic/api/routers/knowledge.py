from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from store_ai_clinic.db.session import SessionLocal
from store_ai_clinic.models.knowledge import KnowledgeChunk, KnowledgeSource
from store_ai_clinic.schemas.knowledge import (
    CreateKnowledgeSourceRequest,
    KnowledgeSourceListItemResponse,
)
from store_ai_clinic.services.knowledge_ingestion import ingest_uploaded_text_source
from store_ai_clinic.services.knowledge_publication import publish_source


router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])
KNOWLEDGE_UPLOAD_ROOT = Path.cwd() / ".tmp" / "knowledge_uploads"


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _build_source_list_item(
    *,
    source: KnowledgeSource,
    chunk_count: int,
) -> KnowledgeSourceListItemResponse:
    return KnowledgeSourceListItemResponse(
        source_id=source.source_id,
        source_title=source.source_title,
        knowledge_type=source.knowledge_type,
        status=source.status,
        version_label=source.version_label,
        updated_at=source.updated_at.isoformat(),
        chunk_count=chunk_count,
    )


@router.get("/sources", response_model=list[KnowledgeSourceListItemResponse])
def list_knowledge_sources(
    db: Session = Depends(get_db),
) -> list[KnowledgeSourceListItemResponse]:
    rows = db.execute(
        select(
            KnowledgeSource.source_id,
            KnowledgeSource.source_title,
            KnowledgeSource.knowledge_type,
            KnowledgeSource.status,
            KnowledgeSource.version_label,
            KnowledgeSource.updated_at,
            func.count(KnowledgeChunk.chunk_id).label("chunk_count"),
        )
        .outerjoin(KnowledgeChunk, KnowledgeChunk.source_id == KnowledgeSource.source_id)
        .group_by(
            KnowledgeSource.source_id,
            KnowledgeSource.source_title,
            KnowledgeSource.knowledge_type,
            KnowledgeSource.status,
            KnowledgeSource.version_label,
            KnowledgeSource.updated_at,
        )
        .order_by(KnowledgeSource.updated_at.desc(), KnowledgeSource.source_id.asc())
    ).all()

    return [
        KnowledgeSourceListItemResponse(
            source_id=row.source_id,
            source_title=row.source_title,
            knowledge_type=row.knowledge_type,
            status=row.status,
            version_label=row.version_label,
            updated_at=row.updated_at.isoformat(),
            chunk_count=row.chunk_count,
        )
        for row in rows
    ]


@router.post("/sources", response_model=KnowledgeSourceListItemResponse, status_code=201)
def create_knowledge_source(
    request: CreateKnowledgeSourceRequest,
    db: Session = Depends(get_db),
) -> KnowledgeSourceListItemResponse:
    title = request.source_title.strip()
    source = KnowledgeSource(
        source_id=f"src_{uuid4().hex[:12]}",
        source_title=title,
        knowledge_type=request.knowledge_type,
        status="pending_publish",
        version_label=request.version_label.strip() if request.version_label else None,
        file_name=f"{title}.txt",
        file_path=f"/knowledge/{uuid4().hex}",
        mime_type="text/plain",
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return _build_source_list_item(source=source, chunk_count=0)


@router.post("/sources/upload", response_model=KnowledgeSourceListItemResponse, status_code=201)
def upload_knowledge_source(
    source_title: str = Form(...),
    knowledge_type: str = Form(...),
    version_label: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> KnowledgeSourceListItemResponse:
    source, chunks = ingest_uploaded_text_source(
        source_title=source_title,
        knowledge_type=knowledge_type,
        version_label=version_label,
        upload_file=file,
        storage_root=KNOWLEDGE_UPLOAD_ROOT,
    )
    db.add(source)
    for chunk in chunks:
        db.add(chunk)
    db.commit()
    db.refresh(source)
    return _build_source_list_item(source=source, chunk_count=len(chunks))


@router.post("/sources/{source_id}/publish", response_model=KnowledgeSourceListItemResponse)
def publish_knowledge_source(
    source_id: str,
    db: Session = Depends(get_db),
) -> KnowledgeSourceListItemResponse:
    source = db.get(KnowledgeSource, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail=f"Unknown source_id: {source_id}")

    publish_source(source)
    db.add(source)
    db.commit()
    db.refresh(source)

    chunk_count = db.scalar(
        select(func.count(KnowledgeChunk.chunk_id)).where(
            KnowledgeChunk.source_id == source_id
        )
    )
    return _build_source_list_item(source=source, chunk_count=chunk_count or 0)
