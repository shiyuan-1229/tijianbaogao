# Enterprise Knowledge RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing Knowledge page and conversation Agent into a first-phase governed enterprise knowledge RAG system with published-only retrieval and visible citations, without rewriting the current conversation handling flow.

**Architecture:** Keep the current conversation session and message pipeline intact, add a standalone Knowledge Retrieval Service and knowledge-governance data model, then extend the existing conversation response payload with citations that the frontend can render as evidence. The work is split into schema, ingestion, retrieval, orchestration integration, and frontend surfaces so each layer can ship with compatibility preserved.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, pgvector, Next.js, Zustand, Vitest

---

## File Structure

### Backend files to create

- `src/store_ai_clinic/models/knowledge.py`
  - SQLAlchemy models for knowledge sources, revisions, chunks, embeddings, tags, publish audit, retrieval logs
- `src/store_ai_clinic/schemas/knowledge.py`
  - Pydantic request and response models for knowledge source management and retrieval
- `src/store_ai_clinic/services/knowledge_ingestion.py`
  - Upload metadata intake, draft creation, source processing lifecycle helpers
- `src/store_ai_clinic/services/knowledge_chunking.py`
  - Knowledge-type-specific chunk creation and chunk metadata shaping
- `src/store_ai_clinic/services/knowledge_retrieval.py`
  - Published-only retrieval, hybrid candidate selection contract, rerank-ready result objects
- `src/store_ai_clinic/services/knowledge_publication.py`
  - Publish, reject, archive transitions and audit writes
- `src/store_ai_clinic/api/routers/knowledge.py`
  - FastAPI endpoints for knowledge source CRUD, publish, reject, archive, and retrieval

### Backend files to modify

- `src/store_ai_clinic/api/main.py`
  - Register the new knowledge router
- `src/store_ai_clinic/services/orchestrator.py`
  - Add retrieval service call and citation-aware response payload without replacing the current answer flow
- `src/store_ai_clinic/api/routers/conversations.py`
  - Extend response DTO with citations and evidence summary
- `src/store_ai_clinic/models/__init__.py` or equivalent import registration file if present
  - Ensure new models are imported into metadata registration

### Frontend files to create

- `store-ai-clinic-web/entities/knowledge/types.ts`
  - DTOs and UI types for knowledge source lifecycle and retrieval artifacts
- `store-ai-clinic-web/entities/conversations/citations.ts`
  - Citation mapping and display helpers
- `store-ai-clinic-web/features/knowledge/components/pending-publish-panel.tsx`
  - Explicit queue for pending publish knowledge
- `store-ai-clinic-web/features/knowledge/components/published-source-panel.tsx`
  - Published source list and metadata display
- `store-ai-clinic-web/features/conversations/components/message-citations.tsx`
  - Visible evidence block under assistant answers

### Frontend files to modify

- `store-ai-clinic-web/shared/store/knowledge-store.ts`
  - Replace mock-only model with lifecycle-aware source state and view shaping
- `store-ai-clinic-web/features/knowledge/components/knowledge-shell.tsx`
  - Introduce overall structure for total overview, source list, pending publish, published views
- `store-ai-clinic-web/features/knowledge/components/source-upload-panel.tsx`
  - Capture knowledge type, version, effective period, and draft lifecycle actions
- `store-ai-clinic-web/features/knowledge/components/rag-status-panel.tsx`
  - Reframe readiness around published and pending knowledge, not mock-only counters
- `store-ai-clinic-web/entities/conversations/types.ts`
  - Extend conversation response and message models to include citations
- `store-ai-clinic-web/entities/conversations/mappers.ts`
  - Map citations into frontend message objects
- `store-ai-clinic-web/features/conversations/components/conversation-thread.tsx`
  - Render citation evidence block under assistant answers
- `store-ai-clinic-web/features/conversations/hooks/use-conversation-thread.ts`
  - Accept citations from conversation API response

### Tests to create or modify

- `tests/unit/services/test_knowledge_publication.py`
- `tests/unit/services/test_knowledge_retrieval.py`
- `tests/integration/test_knowledge_api.py`
- `tests/integration/test_conversations_api.py`
- `store-ai-clinic-web/tests/unit/knowledge-page.test.tsx`
- `store-ai-clinic-web/tests/unit/conversation-page.test.tsx`

---

### Task 1: Add the Knowledge backend data model

**Files:**
- Create: `src/store_ai_clinic/models/knowledge.py`
- Modify: `src/store_ai_clinic/api/main.py`
- Test: `tests/unit/services/test_knowledge_publication.py`

- [ ] **Step 1: Write the failing backend model test**

```python
from store_ai_clinic.models.knowledge import KnowledgeSource


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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/unit/services/test_knowledge_publication.py -k status_defaults_to_draft -v`
Expected: FAIL because `store_ai_clinic.models.knowledge` does not exist yet

- [ ] **Step 3: Write the minimal backend models**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import utc_now


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"

    source_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_title: Mapped[str] = mapped_column(String(255), nullable=False)
    knowledge_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft", index=True)
    version_label: Mapped[str | None] = mapped_column(String(80))
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    chunk_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("knowledge_sources.source_id"), nullable=False, index=True)
    chunk_no: Mapped[int] = mapped_column(Integer, nullable=False)
    page_no: Mapped[int | None] = mapped_column(Integer)
    chapter_title: Mapped[str | None] = mapped_column(String(255))
    section_title: Mapped[str | None] = mapped_column(String(255))
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    summary_text: Mapped[str | None] = mapped_column(Text)
    quote_text: Mapped[str | None] = mapped_column(Text)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/unit/services/test_knowledge_publication.py -k status_defaults_to_draft -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/models/knowledge.py tests/unit/services/test_knowledge_publication.py
git commit -m "feat: add initial knowledge backend models"
```

### Task 2: Add knowledge publication and lifecycle services

**Files:**
- Create: `src/store_ai_clinic/services/knowledge_publication.py`
- Create: `src/store_ai_clinic/schemas/knowledge.py`
- Test: `tests/unit/services/test_knowledge_publication.py`

- [ ] **Step 1: Write the failing publication test**

```python
from store_ai_clinic.services.knowledge_publication import can_retrieve_source


def test_only_published_knowledge_is_retrievable():
    assert can_retrieve_source("published") is True
    assert can_retrieve_source("draft") is False
    assert can_retrieve_source("processing") is False
    assert can_retrieve_source("pending_publish") is False
    assert can_retrieve_source("archived") is False
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/unit/services/test_knowledge_publication.py -k retrievable -v`
Expected: FAIL because `knowledge_publication.py` does not exist yet

- [ ] **Step 3: Write the minimal lifecycle service**

```python
PUBLISHED_STATUS = "published"
NON_RETRIEVABLE_STATUSES = {"draft", "processing", "pending_publish", "archived"}


def can_retrieve_source(status: str) -> bool:
    return status == PUBLISHED_STATUS
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/unit/services/test_knowledge_publication.py -k retrievable -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/services/knowledge_publication.py tests/unit/services/test_knowledge_publication.py
git commit -m "feat: add knowledge publication retrieval gating"
```

### Task 3: Add knowledge retrieval service contract

**Files:**
- Create: `src/store_ai_clinic/services/knowledge_retrieval.py`
- Test: `tests/unit/services/test_knowledge_retrieval.py`

- [ ] **Step 1: Write the failing retrieval contract test**

```python
from store_ai_clinic.services.knowledge_retrieval import KnowledgeCitation, build_empty_retrieval_result


def test_empty_retrieval_result_has_no_citations():
    result = build_empty_retrieval_result(query_text="客诉率上升")

    assert result.query_text == "客诉率上升"
    assert result.citations == []
    assert result.evidence_summary == ""
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/unit/services/test_knowledge_retrieval.py -k empty_retrieval_result -v`
Expected: FAIL because retrieval service does not exist yet

- [ ] **Step 3: Write the minimal retrieval contract**

```python
from dataclasses import dataclass, field


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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/unit/services/test_knowledge_retrieval.py -k empty_retrieval_result -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/services/knowledge_retrieval.py tests/unit/services/test_knowledge_retrieval.py
git commit -m "feat: add knowledge retrieval service contract"
```

### Task 4: Extend conversation response schema with citations

**Files:**
- Modify: `src/store_ai_clinic/api/routers/conversations.py`
- Modify: `src/store_ai_clinic/services/orchestrator.py`
- Modify: `src/store_ai_clinic/schemas/conversations.py`
- Test: `tests/integration/test_conversations_api.py`

- [ ] **Step 1: Write the failing integration assertion**

```python
def test_post_message_response_includes_citations_shape(client):
    response = client.post(
        "/api/conversations/sessions/ses_001/messages",
        json={"message": "客诉率上升怎么办"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "citations" in payload
    assert "evidence_summary" in payload
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/integration/test_conversations_api.py -k includes_citations_shape -v`
Expected: FAIL because current response only has assistant message and suggestions

- [ ] **Step 3: Extend the response models and orchestration result**

```python
class CitationResponse(BaseModel):
    source_id: str
    source_title: str
    knowledge_type: str
    page_no: int | None = None
    chapter_title: str | None = None
    quote_text: str
    version_label: str | None = None


class PostMessageResponse(BaseModel):
    assistant_message: str
    followup_suggestions: list[FollowupSuggestionResponse]
    citations: list[CitationResponse] = []
    evidence_summary: str = ""
```

```python
@dataclass(frozen=True, slots=True)
class OrchestratorResponse:
    intent: str
    answer_text: str
    suggestions: list[FollowupSuggestionItem]
    diagnosis_result: dict[str, object] | None
    citations: list[dict[str, object]]
    evidence_summary: str
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/integration/test_conversations_api.py -k includes_citations_shape -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/api/routers/conversations.py src/store_ai_clinic/services/orchestrator.py src/store_ai_clinic/schemas/conversations.py tests/integration/test_conversations_api.py
git commit -m "feat: extend conversation response with citations"
```

### Task 5: Add Knowledge router and source management endpoints

**Files:**
- Create: `src/store_ai_clinic/api/routers/knowledge.py`
- Modify: `src/store_ai_clinic/api/main.py`
- Test: `tests/integration/test_knowledge_api.py`

- [ ] **Step 1: Write the failing API smoke test**

```python
def test_list_knowledge_sources_route_exists(client):
    response = client.get("/api/knowledge/sources")

    assert response.status_code == 200
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/integration/test_knowledge_api.py -k route_exists -v`
Expected: FAIL with 404 because router is not registered yet

- [ ] **Step 3: Add the minimal router and route registration**

```python
router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/sources")
def list_knowledge_sources() -> list[dict[str, object]]:
    return []
```

```python
app.include_router(knowledge.router)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/integration/test_knowledge_api.py -k route_exists -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/api/routers/knowledge.py src/store_ai_clinic/api/main.py tests/integration/test_knowledge_api.py
git commit -m "feat: add initial knowledge API router"
```

### Task 6: Add frontend citation models and render citations in the conversation thread

**Files:**
- Modify: `store-ai-clinic-web/entities/conversations/types.ts`
- Create: `store-ai-clinic-web/features/conversations/components/message-citations.tsx`
- Modify: `store-ai-clinic-web/entities/conversations/mappers.ts`
- Modify: `store-ai-clinic-web/features/conversations/components/conversation-thread.tsx`
- Test: `store-ai-clinic-web/tests/unit/conversation-page.test.tsx`

- [ ] **Step 1: Write the failing frontend citation test**

```typescript
it("renders visible citations under assistant messages", async () => {
  expect(screen.getByText("依据来源")).toBeInTheDocument();
  expect(screen.getByText("《门店客诉处理规范》 第24页")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- conversation-page.test.tsx -- --runInBand`
Expected: FAIL because citations are not part of the model or UI yet

- [ ] **Step 3: Add minimal citation-aware frontend support**

```typescript
export type ConversationCitationDto = {
  source_id: string;
  source_title: string;
  knowledge_type: string;
  page_no?: number | null;
  chapter_title?: string | null;
  quote_text: string;
  version_label?: string | null;
};

export type ConversationCitation = {
  sourceId: string;
  sourceTitle: string;
  knowledgeType: string;
  pageNo?: number | null;
  chapterTitle?: string | null;
  quoteText: string;
  versionLabel?: string | null;
};
```

```tsx
export function MessageCitations({ citations }: { citations: ConversationCitation[] }) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div>
      <p>依据来源</p>
      {citations.map((citation) => (
        <article key={`${citation.sourceId}:${citation.pageNo ?? "na"}`}>
          <p>{`《${citation.sourceTitle}》 第${citation.pageNo ?? "?"}页`}</p>
          <p>{citation.quoteText}</p>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- conversation-page.test.tsx -- --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/entities/conversations/types.ts store-ai-clinic-web/entities/conversations/mappers.ts store-ai-clinic-web/features/conversations/components/message-citations.tsx store-ai-clinic-web/features/conversations/components/conversation-thread.tsx store-ai-clinic-web/tests/unit/conversation-page.test.tsx
git commit -m "feat: render knowledge citations in conversation thread"
```

### Task 7: Upgrade the Knowledge page into a lifecycle-aware workspace

**Files:**
- Modify: `store-ai-clinic-web/shared/store/knowledge-store.ts`
- Modify: `store-ai-clinic-web/features/knowledge/components/knowledge-shell.tsx`
- Modify: `store-ai-clinic-web/features/knowledge/components/source-upload-panel.tsx`
- Create: `store-ai-clinic-web/features/knowledge/components/pending-publish-panel.tsx`
- Create: `store-ai-clinic-web/features/knowledge/components/published-source-panel.tsx`
- Test: `store-ai-clinic-web/tests/unit/knowledge-page.test.tsx`

- [ ] **Step 1: Write the failing Knowledge page lifecycle test**

```typescript
it("shows a dedicated pending publish view", () => {
  render(<KnowledgePage />);

  expect(screen.getByText("待发布")).toBeInTheDocument();
  expect(screen.getByText("已发布")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- knowledge-page.test.tsx -- --runInBand`
Expected: FAIL because current page only has upload, list, and readiness sections

- [ ] **Step 3: Add minimal lifecycle-aware page structure**

```typescript
export type KnowledgeSourceStatus =
  | "draft"
  | "processing"
  | "pending_publish"
  | "published"
  | "archived";
```

```tsx
<section>
  <h2>待发布</h2>
  <PendingPublishPanel />
</section>
<section>
  <h2>已发布</h2>
  <PublishedSourcePanel />
</section>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- knowledge-page.test.tsx -- --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/shared/store/knowledge-store.ts store-ai-clinic-web/features/knowledge/components/knowledge-shell.tsx store-ai-clinic-web/features/knowledge/components/source-upload-panel.tsx store-ai-clinic-web/features/knowledge/components/pending-publish-panel.tsx store-ai-clinic-web/features/knowledge/components/published-source-panel.tsx store-ai-clinic-web/tests/unit/knowledge-page.test.tsx
git commit -m "feat: add lifecycle-aware knowledge workspace"
```

### Task 8: Integrate retrieval into orchestration without replacing the current flow

**Files:**
- Modify: `src/store_ai_clinic/services/orchestrator.py`
- Modify: `src/store_ai_clinic/api/routers/conversations.py`
- Test: `tests/integration/test_conversations_api.py`

- [ ] **Step 1: Write the failing orchestration integration test**

```python
def test_conversation_turn_surfaces_retrieval_citations(client):
    response = client.post(
        "/api/conversations/sessions/ses_001/messages",
        json={"message": "营业额下降怎么办"},
    )

    payload = response.json()
    assert "citations" in payload
```

- [ ] **Step 2: Run the test to verify it fails for missing integration**

Run: `python -m pytest tests/integration/test_conversations_api.py -k surfaces_retrieval_citations -v`
Expected: FAIL because orchestration still has no retrieval integration

- [ ] **Step 3: Add retrieval call while preserving current answer flow**

```python
retrieval_result = knowledge_retrieval_service.retrieve(
    query_text=user_message_text,
    session_id=session_id,
    store_id=store_id,
)

assistant_message = append_message(
    db,
    session_id=session_id,
    role="assistant",
    message_type="answer",
    content_text=answer_text,
    content_json={
        "diagnosis_result": diagnosis_result,
        "citations": [citation.__dict__ for citation in retrieval_result.citations],
        "evidence_summary": retrieval_result.evidence_summary,
    },
    intent_label=route.intent,
)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/integration/test_conversations_api.py -k surfaces_retrieval_citations -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/services/orchestrator.py src/store_ai_clinic/api/routers/conversations.py tests/integration/test_conversations_api.py
git commit -m "feat: integrate knowledge retrieval into conversation orchestration"
```

### Task 9: Final verification and regression pass

**Files:**
- Verify only

- [ ] **Step 1: Run backend knowledge and conversation tests**

Run: `python -m pytest tests/unit/services/test_knowledge_publication.py tests/unit/services/test_knowledge_retrieval.py tests/integration/test_knowledge_api.py tests/integration/test_conversations_api.py -v`
Expected: all pass

- [ ] **Step 2: Run frontend Knowledge and conversation tests**

Run: `npm run test -- knowledge-page.test.tsx conversation-page.test.tsx conversation-api-routes.test.ts`
Expected: all pass

- [ ] **Step 3: Manual browser verification**

Run and verify:

1. Open `/knowledge`
2. Confirm presence of pending publish and published views
3. Open `/agent`
4. Confirm assistant answers can render an evidence block when citations are present

- [ ] **Step 4: Commit final integration checkpoint**

```bash
git add .
git commit -m "feat: ship first phase enterprise knowledge rag foundation"
```

---

## Self-Review

### Spec coverage

This plan covers:

1. PostgreSQL knowledge table introduction
2. Knowledge source governance and publish gate
3. Retrieval service separation
4. Conversation API citation extension
5. Agent evidence presentation
6. Knowledge page lifecycle upgrade

Knowledge graph remains intentionally out of execution scope for this first plan, consistent with the design doc.

### Placeholder scan

No task uses `TODO`, `TBD`, or vague phrases like “add appropriate handling” without concrete deliverables. Each task names files, commands, and expected outcomes.

### Type consistency

The plan consistently uses:

1. `citations`
2. `evidence_summary`
3. `pending_publish`
4. `published`

No alternate names are introduced later in the plan.

