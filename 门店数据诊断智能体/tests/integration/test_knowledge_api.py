from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from store_ai_clinic.api.main import app
from store_ai_clinic.api.routers import knowledge
from store_ai_clinic.db.base import Base
from store_ai_clinic.models.knowledge import KnowledgeChunk, KnowledgeSource


def _make_session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _build_simple_pdf_bytes(text: str) -> bytes:
    escaped_text = (
        text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    )
    content_stream = f"BT\n/F1 12 Tf\n72 100 Td\n({escaped_text}) Tj\nET"
    objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        (
            "3 0 obj\n"
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] "
            "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n"
            "endobj\n"
        ),
        (
            f"4 0 obj\n<< /Length {len(content_stream.encode('latin-1'))} >>\n"
            f"stream\n{content_stream}\nendstream\nendobj\n"
        ),
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = bytearray()
    offsets = [0]
    for obj in objects:
        offsets.append(len(header) + len(body))
        body.extend(obj.encode("latin-1"))

    xref_start = len(header) + len(body)
    xref_rows = ["xref\n0 6\n", "0000000000 65535 f \n"]
    for offset in offsets[1:]:
        xref_rows.append(f"{offset:010d} 00000 n \n")

    trailer = (
        "trailer\n<< /Size 6 /Root 1 0 R >>\n"
        f"startxref\n{xref_start}\n%%EOF\n"
    )
    return header + bytes(body) + "".join(xref_rows).encode("latin-1") + trailer.encode(
        "latin-1"
    )


def test_list_knowledge_sources_returns_database_rows(monkeypatch):
    session_factory = _make_session_factory()
    monkeypatch.setattr(knowledge, "SessionLocal", session_factory)

    db = session_factory()
    try:
        db.add(
            KnowledgeSource(
                source_id="src_001",
                source_title="运营手册V3",
                knowledge_type="sop",
                status="published",
                version_label="V3",
                file_name="operations-v3.pdf",
                file_path="/tmp/operations-v3.pdf",
                mime_type="application/pdf",
            )
        )
        db.add(
            KnowledgeChunk(
                chunk_id="chunk_001",
                source_id="src_001",
                chunk_no=1,
                page_no=24,
                chapter_title="客诉处理",
                section_title="首响要求",
                chunk_text="门店在收到客诉后，应在30分钟内完成首次响应。",
                summary_text="30分钟内首响。",
                quote_text="门店在收到客诉后，应在30分钟内完成首次响应。",
            )
        )
        db.add(
            KnowledgeSource(
                source_id="src_002",
                source_title="门店巡检记录 2026-06-10",
                knowledge_type="inspection",
                status="pending_publish",
                version_label="2026-06-10",
                file_name="inspection-2026-06-10.pdf",
                file_path="/tmp/inspection-2026-06-10.pdf",
                mime_type="application/pdf",
            )
        )
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    response = client.get("/api/knowledge/sources")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0] == {
        "source_id": "src_001",
        "source_title": "运营手册V3",
        "knowledge_type": "sop",
        "status": "published",
        "version_label": "V3",
        "updated_at": body[0]["updated_at"],
        "chunk_count": 1,
    }
    assert body[1] == {
        "source_id": "src_002",
        "source_title": "门店巡检记录 2026-06-10",
        "knowledge_type": "inspection",
        "status": "pending_publish",
        "version_label": "2026-06-10",
        "updated_at": body[1]["updated_at"],
        "chunk_count": 0,
    }


def test_create_knowledge_source_starts_in_pending_publish(monkeypatch):
    session_factory = _make_session_factory()
    monkeypatch.setattr(knowledge, "SessionLocal", session_factory)

    client = TestClient(app)
    response = client.post(
        "/api/knowledge/sources",
        json={
            "source_title": "门店客诉处理规范",
            "knowledge_type": "sop",
            "version_label": "V1",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source_title"] == "门店客诉处理规范"
    assert body["status"] == "pending_publish"
    assert body["chunk_count"] == 0

    db = session_factory()
    try:
        created = db.get(KnowledgeSource, body["source_id"])
        assert created is not None
        assert created.status == "pending_publish"
        assert created.knowledge_type == "sop"
    finally:
        db.close()


def test_publish_knowledge_source_moves_it_to_published(monkeypatch):
    session_factory = _make_session_factory()
    monkeypatch.setattr(knowledge, "SessionLocal", session_factory)

    db = session_factory()
    try:
        db.add(
            KnowledgeSource(
                source_id="src_to_publish",
                source_title="经营改善行动手册",
                knowledge_type="training",
                status="pending_publish",
                version_label="2026-Q2",
                file_name="ops-playbook.pdf",
                file_path="/tmp/ops-playbook.pdf",
                mime_type="application/pdf",
            )
        )
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    response = client.post("/api/knowledge/sources/src_to_publish/publish")

    assert response.status_code == 200
    body = response.json()
    assert body["source_id"] == "src_to_publish"
    assert body["status"] == "published"

    db = session_factory()
    try:
        published = db.get(KnowledgeSource, "src_to_publish")
        assert published is not None
        assert published.status == "published"
    finally:
        db.close()


def test_upload_knowledge_file_creates_source_and_chunks(monkeypatch):
    session_factory = _make_session_factory()
    monkeypatch.setattr(knowledge, "SessionLocal", session_factory)

    client = TestClient(app)
    response = client.post(
        "/api/knowledge/sources/upload",
        data={
            "source_title": "门店客诉处理规范",
            "knowledge_type": "sop",
            "version_label": "V1",
        },
        files={
            "file": (
                "complaint-sop.txt",
                "第一条：门店在收到客诉后，应在30分钟内完成首次响应。\n第二条：店长需复盘并记录处理结果。",
                "text/plain",
            )
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source_title"] == "门店客诉处理规范"
    assert body["status"] == "pending_publish"
    assert body["chunk_count"] >= 1

    db = session_factory()
    try:
        created = db.get(KnowledgeSource, body["source_id"])
        assert created is not None
        assert created.file_name == "complaint-sop.txt"
        assert created.mime_type == "text/plain"

        chunk_count = db.query(KnowledgeChunk).filter(
            KnowledgeChunk.source_id == body["source_id"]
        ).count()
        assert chunk_count >= 1
    finally:
        db.close()


def test_upload_pdf_knowledge_file_creates_source_and_chunks(monkeypatch):
    session_factory = _make_session_factory()
    monkeypatch.setattr(knowledge, "SessionLocal", session_factory)

    client = TestClient(app)
    response = client.post(
        "/api/knowledge/sources/upload",
        data={
            "source_title": "PDF Operations Manual",
            "knowledge_type": "training",
            "version_label": "V1",
        },
        files={
            "file": (
                "operations-manual.pdf",
                _build_simple_pdf_bytes("Complaint response within 30 minutes."),
                "application/pdf",
            )
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source_title"] == "PDF Operations Manual"
    assert body["status"] == "pending_publish"
    assert body["chunk_count"] >= 1

    db = session_factory()
    try:
        created = db.get(KnowledgeSource, body["source_id"])
        assert created is not None
        assert created.file_name == "operations-manual.pdf"
        assert created.mime_type == "application/pdf"

        chunks = db.query(KnowledgeChunk).filter(
            KnowledgeChunk.source_id == body["source_id"]
        ).all()
        assert len(chunks) >= 1
        assert any("30 minutes" in chunk.chunk_text for chunk in chunks)
    finally:
        db.close()
