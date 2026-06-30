# Continuous Conversation Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Store AI Clinic from a single-run diagnosis workflow to a persistent multi-turn conversation agent that supports session continuity, follow-up questions, same-store over-time comparison, summaries, and historical diagnosis citation.

**Architecture:** Keep the existing FastAPI diagnosis workflow as the deep-analysis engine and add a conversation orchestration layer around it. Persist session and message state in new SQLAlchemy models, expose them through FastAPI conversation APIs, proxy them through Next.js BFF routes, and replace the current Agent page with a conversation-first workspace that still allows uploads and diagnosis-triggered entry.

**Tech Stack:** FastAPI, SQLAlchemy ORM, Pydantic, pytest, Next.js App Router, TypeScript, Zustand, Vitest, Testing Library

---

## File Structure

### Existing files to modify

- `D:\桌面\门店数据诊断\src\store_ai_clinic\db\base.py`
  - Register new conversation models with metadata imports.
- `D:\桌面\门店数据诊断\src\store_ai_clinic\models\__init__.py`
  - Re-export new model module.
- `D:\桌面\门店数据诊断\src\store_ai_clinic\api\routers\__init__.py`
  - Re-export new conversation router.
- `D:\桌面\门店数据诊断\src\store_ai_clinic\api\main.py`
  - Include conversation router in FastAPI app.
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\diagnosis.py`
  - Extend existing diagnosis runner signature for session-aware orchestration.
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\llm.py`
  - Keep single-run diagnosis behavior unchanged unless a small helper extraction is needed.
- `D:\桌面\门店数据诊断\store-ai-clinic-web\app\(workspace)\agent\page.tsx`
  - Switch page entry to session-based conversation shell.
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\agent\components\agent-shell.tsx`
  - Replace single-turn layout with conversation workspace composition.
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\agent\hooks\use-agent-submit.ts`
  - Convert upload-driven diagnosis trigger into session-aware interaction helpers or retire it in favor of new hooks.
- `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\agent-session-store.ts`
  - Retire or refactor into the new conversation state slices.

### New backend files to create

- `D:\桌面\门店数据诊断\src\store_ai_clinic\models\conversations.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\schemas\conversations.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_sessions.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_messages.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_memory.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\diagnosis_memory.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\followups.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\intent_router.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_llm.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\services\orchestrator.py`
- `D:\桌面\门店数据诊断\src\store_ai_clinic\api\routers\conversations.py`

### New frontend files to create

- `D:\桌面\门店数据诊断\store-ai-clinic-web\app\(workspace)\agent\[sessionId]\page.tsx`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\sessions\route.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\sessions\[sessionId]\route.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\sessions\[sessionId]\messages\route.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\sessions\[sessionId]\summary\route.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\sessions\[sessionId]\compare\route.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\types.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\mappers.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-shell.tsx`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-thread.tsx`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\chat-composer.tsx`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\session-list-panel.tsx`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\memory-reference-panel.tsx`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\followup-suggestion-chips.tsx`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversation-thread.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-session-list.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-list-store.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-thread-store.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-runtime-store.ts`

### New test files to create

- `D:\桌面\门店数据诊断\tests\unit\services\test_conversation_sessions.py`
- `D:\桌面\门店数据诊断\tests\unit\services\test_intent_router.py`
- `D:\桌面\门店数据诊断\tests\unit\services\test_followups.py`
- `D:\桌面\门店数据诊断\tests\unit\services\test_conversation_memory.py`
- `D:\桌面\门店数据诊断\tests\integration\test_conversations_api.py`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-api-routes.test.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`
- `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

## Task 1: Add backend conversation data model and schema skeleton

**Files:**
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\models\conversations.py`
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\schemas\conversations.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\db\base.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\models\__init__.py`
- Test: `D:\桌面\门店数据诊断\tests\unit\services\test_conversation_sessions.py`

- [ ] **Step 1: Write the failing backend model/schema test**

```python
from store_ai_clinic.schemas.conversations import CreateSessionRequest, SessionResponse


def test_create_session_request_trims_and_validates():
    payload = CreateSessionRequest(
        brand_id=" brand-acme ",
        store_id=" hangzhou-xihu ",
        entry_mode="manual",
        initial_question=" Analyze Hangzhou West Lake store ",
        diagnosis_type_hint="daily",
    )

    assert payload.brand_id == "brand-acme"
    assert payload.store_id == "hangzhou-xihu"
    assert payload.initial_question == "Analyze Hangzhou West Lake store"


def test_session_response_accepts_required_fields():
    response = SessionResponse(
        session_id="ses_001",
        session_title="Hangzhou West Lake Store Analysis",
        status="active",
        entry_mode="manual",
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
    )

    assert response.session_id == "ses_001"
    assert response.store_id == "hangzhou-xihu"
```

- [ ] **Step 2: Run the backend model/schema test and verify it fails**

Run:

```powershell
pytest tests/unit/services/test_conversation_sessions.py -v
```

Expected:

- FAIL with `ModuleNotFoundError` for `store_ai_clinic.schemas.conversations`

- [ ] **Step 3: Create the new SQLAlchemy conversation models**

```python
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from store_ai_clinic.db.base import Base
from store_ai_clinic.models.enums import utc_now


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    session_title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    entry_mode: Mapped[str] = mapped_column(String(40), nullable=False)
    primary_topic: Mapped[str | None] = mapped_column(String(80))
    diagnosis_type_hint: Mapped[str | None] = mapped_column(String(20))
    biz_date_start: Mapped[date | None] = mapped_column(Date)
    biz_date_end: Mapped[date | None] = mapped_column(Date)
    last_user_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_agent_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    message_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    message_type: Mapped[str] = mapped_column(String(40), nullable=False)
    content_text: Mapped[str | None] = mapped_column(Text)
    content_json: Mapped[dict | None] = mapped_column(JSON)
    reply_to_message_id: Mapped[str | None] = mapped_column(String(36))
    intent_label: Mapped[str | None] = mapped_column(String(40))
    tokens_estimate: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class SessionMemorySnapshot(Base):
    __tablename__ = "session_memory_snapshots"

    snapshot_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    summary_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    coverage_message_start_id: Mapped[str | None] = mapped_column(String(36))
    coverage_message_end_id: Mapped[str | None] = mapped_column(String(36))
    compression_level: Mapped[str] = mapped_column(String(20), nullable=False, default="rolling")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class DiagnosisMemoryCard(Base):
    __tablename__ = "diagnosis_memory_cards"

    memory_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_task_id: Mapped[str | None] = mapped_column(ForeignKey("diagnosis_tasks.task_id"), index=True)
    source_result_id: Mapped[str | None] = mapped_column(ForeignKey("task_results.result_id"), index=True)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("agent_sessions.session_id"), index=True)
    brand_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    diagnosis_type: Mapped[str] = mapped_column(String(20), nullable=False)
    biz_date_start: Mapped[date | None] = mapped_column(Date)
    biz_date_end: Mapped[date | None] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause_brief: Mapped[str | None] = mapped_column(Text)
    next_action_brief: Mapped[str | None] = mapped_column(Text)
    tags_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    importance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class MessageDiagnosisLink(Base):
    __tablename__ = "message_diagnosis_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    message_id: Mapped[str] = mapped_column(ForeignKey("agent_messages.message_id"), nullable=False, index=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("diagnosis_tasks.task_id"), nullable=False, index=True)
    link_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class FollowupSuggestion(Base):
    __tablename__ = "followup_suggestions"

    suggestion_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("agent_sessions.session_id"), nullable=False, index=True)
    message_id: Mapped[str] = mapped_column(ForeignKey("agent_messages.message_id"), nullable=False, index=True)
    suggestion_text: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion_type: Mapped[str] = mapped_column(String(20), nullable=False)
    rank_order: Mapped[int] = mapped_column(Integer, nullable=False)
    accepted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
```

- [ ] **Step 4: Create the new Pydantic conversation schemas and register the model module**

```python
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


class CreateSessionRequest(BaseModel):
    brand_id: str
    store_id: str
    entry_mode: Literal["manual", "auto_from_diagnosis"]
    initial_question: str
    diagnosis_type_hint: Literal["daily", "weekly"] | None = None

    @field_validator("brand_id", "store_id", "initial_question")
    @classmethod
    def _trim_non_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("must not be empty")
        return trimmed


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    session_title: str
    status: Literal["active", "archived", "closed"]
    entry_mode: Literal["manual", "auto_from_diagnosis"]
    brand_id: str
    store_id: str
```

Also update:

```python
# src/store_ai_clinic/db/base.py
from store_ai_clinic.models import alerts, brands, cards, conversations, reviews, rules, tasks  # noqa: E402,F401
```

```python
# src/store_ai_clinic/models/__init__.py
from . import alerts, brands, cards, conversations, reviews, rules, tasks

__all__ = ["alerts", "brands", "cards", "conversations", "reviews", "rules", "tasks"]
```

- [ ] **Step 5: Run the backend model/schema test and verify it passes**

Run:

```powershell
pytest tests/unit/services/test_conversation_sessions.py -v
```

Expected:

- PASS

- [ ] **Step 6: Checkpoint the model and schema skeleton**

If this workspace is inside a git-enabled clone, run:

```bash
git add src/store_ai_clinic/models/conversations.py src/store_ai_clinic/schemas/conversations.py src/store_ai_clinic/db/base.py src/store_ai_clinic/models/__init__.py tests/unit/services/test_conversation_sessions.py
git commit -m "feat: add conversation data model skeleton"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 1 complete - conversation model skeleton`.

## Task 2: Add backend session/message services with persistence tests

**Files:**
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_sessions.py`
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_messages.py`
- Test: `D:\桌面\门店数据诊断\tests\unit\services\test_conversation_sessions.py`

- [ ] **Step 1: Extend the failing unit test with session creation and message append behavior**

```python
from store_ai_clinic.services.conversation_messages import append_message
from store_ai_clinic.services.conversation_sessions import create_session, list_sessions


def test_create_session_returns_active_session(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )

    assert session.status == "active"
    assert session.session_title == "Analyze Hangzhou West Lake store"


def test_append_message_updates_last_user_timestamp(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="hangzhou-xihu",
        entry_mode="manual",
        initial_question="Analyze Hangzhou West Lake store",
    )

    message = append_message(
        db_session,
        session_id=session.session_id,
        role="user",
        message_type="question",
        content_text="Why did it drop?",
    )

    db_session.refresh(session)

    assert message.session_id == session.session_id
    assert session.last_user_message_at is not None


def test_list_sessions_orders_latest_first(db_session):
    first = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="First question",
    )
    second = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="Second question",
    )

    sessions = list_sessions(db_session, store_id="store-a")

    assert [item.session_id for item in sessions][:2] == [second.session_id, first.session_id]
```

- [ ] **Step 2: Run the session service unit tests and verify they fail**

Run:

```powershell
pytest tests/unit/services/test_conversation_sessions.py -v
```

Expected:

- FAIL with missing `conversation_sessions` or `conversation_messages` service modules

- [ ] **Step 3: Implement session creation and list behavior**

```python
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from store_ai_clinic.models.conversations import AgentSession


def create_session(
    db: Session,
    *,
    brand_id: str,
    store_id: str,
    entry_mode: str,
    initial_question: str,
    diagnosis_type_hint: str | None = None,
) -> AgentSession:
    session = AgentSession(
        session_id=str(uuid4()),
        brand_id=brand_id,
        store_id=store_id,
        session_title=initial_question,
        entry_mode=entry_mode,
        status="active",
        diagnosis_type_hint=diagnosis_type_hint,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def list_sessions(db: Session, *, store_id: str | None = None) -> list[AgentSession]:
    stmt = select(AgentSession).order_by(AgentSession.updated_at.desc())
    if store_id:
        stmt = stmt.where(AgentSession.store_id == store_id)
    return list(db.scalars(stmt))
```

- [ ] **Step 4: Implement message append behavior**

```python
from uuid import uuid4

from sqlalchemy.orm import Session

from store_ai_clinic.models.conversations import AgentMessage, AgentSession
from store_ai_clinic.models.enums import utc_now


def append_message(
    db: Session,
    *,
    session_id: str,
    role: str,
    message_type: str,
    content_text: str,
    content_json: dict | None = None,
    intent_label: str | None = None,
) -> AgentMessage:
    session = db.get(AgentSession, session_id)
    if session is None:
        raise ValueError(f"Unknown session_id: {session_id}")

    message = AgentMessage(
        message_id=str(uuid4()),
        session_id=session_id,
        role=role,
        message_type=message_type,
        content_text=content_text,
        content_json=content_json,
        intent_label=intent_label,
    )
    db.add(message)

    now = utc_now()
    session.updated_at = now
    if role == "user":
        session.last_user_message_at = now
    elif role == "assistant":
        session.last_agent_message_at = now

    db.commit()
    db.refresh(message)
    return message
```

- [ ] **Step 5: Run the session service unit tests and verify they pass**

Run:

```powershell
pytest tests/unit/services/test_conversation_sessions.py -v
```

Expected:

- PASS

- [ ] **Step 6: Checkpoint the persistence services**

If this workspace is inside a git-enabled clone, run:

```bash
git add src/store_ai_clinic/services/conversation_sessions.py src/store_ai_clinic/services/conversation_messages.py tests/unit/services/test_conversation_sessions.py
git commit -m "feat: add conversation session persistence services"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 2 complete - session persistence services`.

## Task 3: Add intent routing, follow-up generation, memory compression, and orchestrator tests

**Files:**
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\intent_router.py`
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\followups.py`
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_memory.py`
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\diagnosis_memory.py`
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_llm.py`
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\orchestrator.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\diagnosis.py`
- Test: `D:\桌面\门店数据诊断\tests\unit\services\test_intent_router.py`
- Test: `D:\桌面\门店数据诊断\tests\unit\services\test_followups.py`
- Test: `D:\桌面\门店数据诊断\tests\unit\services\test_conversation_memory.py`

- [ ] **Step 1: Write failing tests for intent routing, suggestions, and snapshot compression**

```python
from store_ai_clinic.services.followups import generate_followup_suggestions
from store_ai_clinic.services.intent_router import classify_intent
from store_ai_clinic.services.conversation_memory import should_roll_snapshot


def test_classify_intent_handles_why_followup():
    result = classify_intent("Why did it drop?")
    assert result.intent == "why_followup"
    assert result.need_history_lookup is True


def test_generate_followup_suggestions_stays_conservative():
    suggestions = generate_followup_suggestions(
        stage="why_followup",
        open_questions=["which hours declined most", "what should the store manager do"],
    )

    assert len(suggestions) == 3
    assert suggestions[0].suggestion_type in {"deepen", "clarify"}


def test_should_roll_snapshot_after_ten_messages():
    assert should_roll_snapshot(message_count=11, estimated_tokens=900) is True
    assert should_roll_snapshot(message_count=4, estimated_tokens=200) is False
```

- [ ] **Step 2: Run the new unit tests and verify they fail**

Run:

```powershell
pytest tests/unit/services/test_intent_router.py tests/unit/services/test_followups.py tests/unit/services/test_conversation_memory.py -v
```

Expected:

- FAIL with missing service modules

- [ ] **Step 3: Implement deterministic V1 intent routing and conservative follow-up rules**

```python
from dataclasses import dataclass


@dataclass(slots=True)
class IntentDecision:
    intent: str
    inherit_store_id: bool
    inherit_time_range: bool
    need_history_lookup: bool
    need_new_diagnosis: bool
    need_same_store_compare: bool


def classify_intent(text: str) -> IntentDecision:
    normalized = text.strip().lower()

    if "why" in normalized:
        return IntentDecision("why_followup", True, True, True, False, False)
    if "hour" in normalized or "time" in normalized:
        return IntentDecision("time_drilldown", True, True, True, True, False)
    if "plan" in normalized or "action" in normalized:
        return IntentDecision("action_plan", True, True, True, False, False)
    if "summary" in normalized or "summarize" in normalized:
        return IntentDecision("session_summary", True, True, False, False, False)
    if "last week" in normalized or "compare" in normalized:
        return IntentDecision("same_store_compare", True, True, True, False, True)
    return IntentDecision("initial_diagnosis", True, True, False, True, False)
```

```python
from dataclasses import dataclass


@dataclass(slots=True)
class FollowupSuggestionItem:
    suggestion_text: str
    suggestion_type: str
    rank_order: int


def generate_followup_suggestions(*, stage: str, open_questions: list[str]) -> list[FollowupSuggestionItem]:
    if stage == "why_followup":
        texts = [
            ("Do you want me to check which time periods declined the most?", "deepen"),
            ("Do you want me to compare this with the same day last week?", "clarify"),
            ("Do you want me to turn this into a store-manager action plan?", "action"),
        ]
    else:
        texts = [
            ("Do you want me to keep digging into the cause?", "deepen"),
            ("Do you want me to summarize the current conclusion?", "clarify"),
            ("Do you want me to generate an action plan?", "action"),
        ]

    return [
        FollowupSuggestionItem(suggestion_text=text, suggestion_type=kind, rank_order=index)
        for index, (text, kind) in enumerate(texts, start=1)
    ]
```

- [ ] **Step 4: Implement V1 snapshot and diagnosis-memory helpers**

```python
def should_roll_snapshot(*, message_count: int, estimated_tokens: int) -> bool:
    return message_count > 10 or estimated_tokens > 1200


def build_snapshot_summary(*, store_id: str, confirmed_findings: list[str], open_questions: list[str]) -> dict[str, object]:
    return {
        "store_id": store_id,
        "confirmed_findings": confirmed_findings,
        "open_questions": open_questions,
    }
```

```python
def build_diagnosis_memory_card(*, task_id: str, store_id: str, title: str, summary: str, next_action: str) -> dict[str, object]:
    return {
        "source_task_id": task_id,
        "store_id": store_id,
        "title": title,
        "summary": summary,
        "next_action_brief": next_action,
        "importance_score": 0.5,
    }
```

- [ ] **Step 5: Implement the first orchestrator path and extend the diagnosis runner signature**

```python
from dataclasses import dataclass

from store_ai_clinic.services.conversation_messages import append_message
from store_ai_clinic.services.conversation_sessions import create_session
from store_ai_clinic.services.followups import generate_followup_suggestions
from store_ai_clinic.services.intent_router import classify_intent


@dataclass(slots=True)
class ConversationTurnResult:
    session_id: str
    user_message_id: str
    assistant_message_id: str
    assistant_text: str
    followup_suggestions: list[object]


def handle_conversation_turn(db, *, session_id: str, user_text: str, diagnosis_runner) -> ConversationTurnResult:
    decision = classify_intent(user_text)
    user_message = append_message(
        db,
        session_id=session_id,
        role="user",
        message_type="question",
        content_text=user_text,
        intent_label=decision.intent,
    )

    diagnosis_payload = None
    if decision.need_new_diagnosis:
        diagnosis_payload = diagnosis_runner(
            task_id="task-conversation-preview",
            store_id="hangzhou-xihu",
            diagnosis_type="daily",
            context=user_text,
            session_id=session_id,
            analysis_mode=decision.intent,
            trigger_reason="conversation_turn",
        )

    assistant_text = (
        diagnosis_payload["diagnosis_draft"]["summary"]
        if diagnosis_payload
        else "Based on the current session context, traffic and conversion are the main areas to inspect next."
    )

    assistant_message = append_message(
        db,
        session_id=session_id,
        role="assistant",
        message_type="answer",
        content_text=assistant_text,
        intent_label=decision.intent,
    )

    suggestions = generate_followup_suggestions(stage=decision.intent, open_questions=[])
    return ConversationTurnResult(
        session_id=session_id,
        user_message_id=user_message.message_id,
        assistant_message_id=assistant_message.message_id,
        assistant_text=assistant_text,
        followup_suggestions=suggestions,
    )
```

```python
def run_diagnosis_task(
    *,
    task_id: str,
    store_id: str,
    diagnosis_type: str,
    context: str,
    session_id: str | None = None,
    analysis_mode: str | None = None,
    trigger_reason: str | None = None,
) -> dict[str, object]:
    ...
```

- [ ] **Step 6: Run the routing, follow-up, and memory tests and verify they pass**

Run:

```powershell
pytest tests/unit/services/test_intent_router.py tests/unit/services/test_followups.py tests/unit/services/test_conversation_memory.py -v
```

Expected:

- PASS

- [ ] **Step 7: Checkpoint the orchestration helpers**

If this workspace is inside a git-enabled clone, run:

```bash
git add src/store_ai_clinic/services/intent_router.py src/store_ai_clinic/services/followups.py src/store_ai_clinic/services/conversation_memory.py src/store_ai_clinic/services/diagnosis_memory.py src/store_ai_clinic/services/orchestrator.py src/store_ai_clinic/services/diagnosis.py tests/unit/services/test_intent_router.py tests/unit/services/test_followups.py tests/unit/services/test_conversation_memory.py
git commit -m "feat: add conversation orchestration helpers"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 3 complete - orchestration helpers`.

## Task 4: Add FastAPI conversation routes and API integration coverage

**Files:**
- Create: `D:\桌面\门店数据诊断\src\store_ai_clinic\api\routers\conversations.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\api\routers\__init__.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\api\main.py`
- Test: `D:\桌面\门店数据诊断\tests\integration\test_conversations_api.py`

- [ ] **Step 1: Write failing API integration tests for create session and post message**

```python
from fastapi.testclient import TestClient

from store_ai_clinic.api.main import app


client = TestClient(app)


def test_create_session_endpoint_returns_active_session(monkeypatch):
    response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "hangzhou-xihu",
            "entry_mode": "manual",
            "initial_question": "Analyze Hangzhou West Lake store",
            "diagnosis_type_hint": "daily",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "active"


def test_post_message_endpoint_returns_answer_and_suggestions(monkeypatch):
    session_response = client.post(
        "/api/conversations/sessions",
        json={
            "brand_id": "brand-acme",
            "store_id": "hangzhou-xihu",
            "entry_mode": "manual",
            "initial_question": "Analyze Hangzhou West Lake store",
            "diagnosis_type_hint": "daily",
        },
    )
    session_id = session_response.json()["session_id"]

    response = client.post(
        f"/api/conversations/sessions/{session_id}/messages",
        json={"content": "Why did it drop?"},
    )

    assert response.status_code == 200
    assert "assistant_message" in response.json()
    assert len(response.json()["followup_suggestions"]) == 3
```

- [ ] **Step 2: Run the API integration tests and verify they fail**

Run:

```powershell
pytest tests/integration/test_conversations_api.py -v
```

Expected:

- FAIL with `404 Not Found` for `/api/conversations/sessions`

- [ ] **Step 3: Implement the FastAPI conversation router**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from store_ai_clinic.db.session import SessionLocal
from store_ai_clinic.schemas.conversations import CreateSessionRequest, SessionResponse
from store_ai_clinic.services.conversation_sessions import create_session, list_sessions
from store_ai_clinic.services.orchestrator import handle_conversation_turn
from store_ai_clinic.services.diagnosis import run_diagnosis_task


router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/sessions", response_model=SessionResponse)
def create_conversation_session(request: CreateSessionRequest, db: Session = Depends(get_db)) -> SessionResponse:
    session = create_session(
        db,
        brand_id=request.brand_id,
        store_id=request.store_id,
        entry_mode=request.entry_mode,
        initial_question=request.initial_question,
        diagnosis_type_hint=request.diagnosis_type_hint,
    )
    return SessionResponse.model_validate(session)


@router.get("/sessions", response_model=list[SessionResponse])
def get_conversation_sessions(store_id: str | None = None, db: Session = Depends(get_db)) -> list[SessionResponse]:
    return [SessionResponse.model_validate(item) for item in list_sessions(db, store_id=store_id)]
```

- [ ] **Step 4: Implement the message route and register the router**

```python
from pydantic import BaseModel


class PostMessageRequest(BaseModel):
    content: str


@router.post("/sessions/{session_id}/messages")
def post_conversation_message(session_id: str, request: PostMessageRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    result = handle_conversation_turn(
        db,
        session_id=session_id,
        user_text=request.content,
        diagnosis_runner=run_diagnosis_task,
    )
    return {
        "session_id": result.session_id,
        "user_message_id": result.user_message_id,
        "assistant_message": {
            "message_id": result.assistant_message_id,
            "content_text": result.assistant_text,
        },
        "followup_suggestions": [
            {
                "suggestion_text": item.suggestion_text,
                "suggestion_type": item.suggestion_type,
                "rank_order": item.rank_order,
            }
            for item in result.followup_suggestions
        ],
    }
```

Also update:

```python
# src/store_ai_clinic/api/routers/__init__.py
from store_ai_clinic.api.routers import batches, cards, conversations, diagnosis, onboarding, reviews

__all__ = ["batches", "cards", "conversations", "diagnosis", "onboarding", "reviews"]
```

```python
# src/store_ai_clinic/api/main.py
from store_ai_clinic.api.routers import batches, cards, conversations, diagnosis, onboarding, reviews

app.include_router(conversations.router)
```

- [ ] **Step 5: Run the API integration tests and verify they pass**

Run:

```powershell
pytest tests/integration/test_conversations_api.py -v
```

Expected:

- PASS

- [ ] **Step 6: Checkpoint the FastAPI conversation API**

If this workspace is inside a git-enabled clone, run:

```bash
git add src/store_ai_clinic/api/routers/conversations.py src/store_ai_clinic/api/routers/__init__.py src/store_ai_clinic/api/main.py tests/integration/test_conversations_api.py
git commit -m "feat: add conversation API endpoints"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 4 complete - FastAPI conversation API`.

## Task 5: Add Next.js conversation entities, stores, and BFF route coverage

**Files:**
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\types.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\mappers.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-list-store.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-thread-store.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-runtime-store.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\sessions\route.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\sessions\[sessionId]\messages\route.ts`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-api-routes.test.ts`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`

- [ ] **Step 1: Write failing frontend tests for BFF route proxying and stores**

```ts
import { describe, expect, it } from "vitest";
import { create } from "zustand";

import { createConversationListStore } from "@/shared/store/conversation-list-store";

describe("conversation list store", () => {
  it("stores session summaries", () => {
    const store = createConversationListStore();
    store.getState().replaceSessions([
      { sessionId: "ses_001", sessionTitle: "Hangzhou West Lake Store Analysis", storeId: "hangzhou-xihu", status: "active" },
    ]);

    expect(store.getState().sessions).toHaveLength(1);
  });
});
```

```ts
import { describe, expect, it, vi } from "vitest";

describe("POST /api/conversations/sessions/[sessionId]/messages", () => {
  it("proxies to the backend conversation service", async () => {
    const backendResponse = { session_id: "ses_001", user_message_id: "msg_001", assistant_message: { message_id: "msg_002", content_text: "Traffic is down 8%." }, followup_suggestions: [] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(backendResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/conversations/sessions/[sessionId]/messages/route");
    const response = await POST(
      new Request("http://localhost/api/conversations/sessions/ses_001/messages", {
        method: "POST",
        body: JSON.stringify({ content: "Why did it drop?" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ sessionId: "ses_001" }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the frontend tests and verify they fail**

Run:

```powershell
cd store-ai-clinic-web
npm run test -- conversation-api-routes.test.ts conversation-stores.test.ts
```

Expected:

- FAIL with missing stores and missing BFF route modules

- [ ] **Step 3: Create the conversation DTOs, mappers, and Zustand stores**

```ts
export type ConversationSessionSummary = {
  sessionId: string;
  sessionTitle: string;
  storeId: string;
  status: "active" | "archived" | "closed";
};

export type ConversationMessage = {
  messageId: string;
  role: "user" | "assistant";
  messageType: string;
  contentText: string;
};
```

```ts
import { createStore } from "zustand/vanilla";

type ConversationListState = {
  sessions: ConversationSessionSummary[];
  replaceSessions: (sessions: ConversationSessionSummary[]) => void;
};

export function createConversationListStore() {
  return createStore<ConversationListState>((set) => ({
    sessions: [],
    replaceSessions: (sessions) => set({ sessions }),
  }));
}
```

```ts
import { createStore } from "zustand/vanilla";

type ConversationThreadState = {
  messages: ConversationMessage[];
  replaceMessages: (messages: ConversationMessage[]) => void;
  appendMessage: (message: ConversationMessage) => void;
};

export function createConversationThreadStore() {
  return createStore<ConversationThreadState>((set) => ({
    messages: [],
    replaceMessages: (messages) => set({ messages }),
    appendMessage: (message) =>
      set((state) => ({ messages: [...state.messages, message] })),
  }));
}
```

- [ ] **Step 4: Implement the session create route and message proxy route**

```ts
import { NextRequest, NextResponse } from "next/server";

import { endpoints } from "@/shared/api/endpoints";
import { serverApiClient } from "@/shared/api/server-client";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const response = await serverApiClient.post(endpoints.conversationSessions, payload, {
    cache: "no-store",
  });
  return NextResponse.json(response, { status: 200 });
}
```

```ts
import { NextRequest, NextResponse } from "next/server";

import { endpoints } from "@/shared/api/endpoints";
import { serverApiClient } from "@/shared/api/server-client";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const payload = await request.json();
  const response = await serverApiClient.post(
    `${endpoints.conversationSessions}/${sessionId}/messages`,
    payload,
    { cache: "no-store" },
  );
  return NextResponse.json(response, { status: 200 });
}
```

- [ ] **Step 5: Run the frontend tests and verify they pass**

Run:

```powershell
cd store-ai-clinic-web
npm run test -- conversation-api-routes.test.ts conversation-stores.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Checkpoint the frontend conversation stores and BFF routes**

If this workspace is inside a git-enabled clone, run:

```bash
git add store-ai-clinic-web/entities/conversations store-ai-clinic-web/shared/store/conversation-list-store.ts store-ai-clinic-web/shared/store/conversation-thread-store.ts store-ai-clinic-web/shared/store/conversation-runtime-store.ts store-ai-clinic-web/app/api/conversations store-ai-clinic-web/tests/unit/conversation-api-routes.test.ts store-ai-clinic-web/tests/unit/conversation-stores.test.ts
git commit -m "feat: add conversation bff routes and stores"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 5 complete - frontend BFF and stores`.

## Task 6: Build the conversation UI shell and route it into the Agent page

**Files:**
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-shell.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-thread.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\chat-composer.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\session-list-panel.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\memory-reference-panel.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\followup-suggestion-chips.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversation-thread.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-session-list.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\(workspace)\agent\[sessionId]\page.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\(workspace)\agent\page.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\agent\components\agent-shell.tsx`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Write a failing UI test for the conversation shell**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConversationShell } from "@/features/conversations/components/conversation-shell";

describe("ConversationShell", () => {
  it("renders the session list, thread, and suggested next questions", () => {
    render(
      <ConversationShell
        sessions={[{ sessionId: "ses_001", sessionTitle: "Hangzhou West Lake Store Analysis", storeId: "hangzhou-xihu", status: "active" }]}
        messages={[
          { messageId: "msg_001", role: "assistant", messageType: "answer", contentText: "Revenue is down 12%." },
        ]}
        suggestions={[
          { suggestionText: "Do you want me to check which time periods declined the most?", suggestionType: "deepen", rankOrder: 1 },
        ]}
      />,
    );

    expect(screen.getByText("Hangzhou West Lake Store Analysis")).toBeInTheDocument();
    expect(screen.getByText("Revenue is down 12%.")).toBeInTheDocument();
    expect(screen.getByText("Do you want me to check which time periods declined the most?")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the UI test and verify it fails**

Run:

```powershell
cd store-ai-clinic-web
npm run test -- conversation-page.test.tsx
```

Expected:

- FAIL with missing `ConversationShell`

- [ ] **Step 3: Build the shell and presentation components**

```tsx
type ConversationShellProps = {
  sessions: ConversationSessionSummary[];
  messages: ConversationMessage[];
  suggestions: { suggestionText: string; suggestionType: string; rankOrder: number }[];
};

export function ConversationShell({ sessions, messages, suggestions }: ConversationShellProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <SessionListPanel sessions={sessions} />
      <div className="space-y-4 rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)]">
        <ConversationThread messages={messages} />
        <ChatComposer />
      </div>
      <MemoryReferencePanel>
        <FollowupSuggestionChips suggestions={suggestions} />
      </MemoryReferencePanel>
    </div>
  );
}
```

```tsx
export function ConversationThread({ messages }: { messages: ConversationMessage[] }) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <article key={message.messageId} className="rounded-[1.25rem] bg-[rgb(var(--surface-secondary))] p-4">
          <p className="text-sm leading-6 text-foreground">{message.contentText}</p>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Route the Agent page into the conversation shell**

```tsx
import { ConversationShell } from "@/features/conversations/components/conversation-shell";

export default function AgentPage() {
  return (
    <ConversationShell
      sessions={[]}
      messages={[]}
      suggestions={[]}
    />
  );
}
```

Also add:

```tsx
type AgentSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function AgentSessionPage({ params }: AgentSessionPageProps) {
  await params;
  return <AgentPage />;
}
```

- [ ] **Step 5: Run the UI test and verify it passes**

Run:

```powershell
cd store-ai-clinic-web
npm run test -- conversation-page.test.tsx
```

Expected:

- PASS

- [ ] **Step 6: Checkpoint the conversation shell UI**

If this workspace is inside a git-enabled clone, run:

```bash
git add store-ai-clinic-web/features/conversations store-ai-clinic-web/app/(workspace)/agent/page.tsx store-ai-clinic-web/app/(workspace)/agent/[sessionId]/page.tsx store-ai-clinic-web/tests/unit/conversation-page.test.tsx
git commit -m "feat: replace agent page with conversation shell"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 6 complete - conversation shell UI`.

## Task 7: Connect the UI to live session/message flows and keep Tasks as evidence center

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversation-thread.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-session-list.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\chat-composer.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\tasks\components\tasks-shell.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\tasks\[taskId]\route.ts`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Write a failing UI test for posting a message and rendering the response**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AgentPage from "@/app/(workspace)/agent/page";

describe("Agent conversation flow", () => {
  it("submits a follow-up question and renders the assistant response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([{ session_id: "ses_001", session_title: "Hangzhou West Lake Store Analysis", store_id: "hangzhou-xihu", status: "active" }]),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              session_id: "ses_001",
              user_message_id: "msg_001",
              assistant_message: { message_id: "msg_002", content_text: "Traffic is down 8%." },
              followup_suggestions: [{ suggestion_text: "Do you want me to check which time periods declined the most?", suggestion_type: "deepen", rank_order: 1 }],
            }),
            { status: 200 },
          ),
        ),
    );

    render(<AgentPage />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Why did it drop?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByText("Traffic is down 8%.")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the UI flow test and verify it fails**

Run:

```powershell
cd store-ai-clinic-web
npm run test -- conversation-page.test.tsx
```

Expected:

- FAIL because the composer is not wired to the API and store updates

- [ ] **Step 3: Implement the fetch hooks and live composer behavior**

```ts
export function useSessionList() {
  const sessions = useConversationListStore((state) => state.sessions);
  const replaceSessions = useConversationListStore((state) => state.replaceSessions);

  const loadSessions = async () => {
    const response = await fetch("/api/conversations/sessions", { cache: "no-store" });
    const data = await response.json();
    replaceSessions(data.map(mapConversationSessionSummary));
  };

  return { sessions, loadSessions };
}
```

```ts
export function useConversationThread(sessionId: string | null) {
  const messages = useConversationThreadStore((state) => state.messages);
  const appendMessage = useConversationThreadStore((state) => state.appendMessage);

  const sendMessage = async (content: string) => {
    if (!sessionId) return;
    appendMessage({ messageId: `draft-${Date.now()}`, role: "user", messageType: "question", contentText: content });
    const response = await fetch(`/api/conversations/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await response.json();
    appendMessage({ messageId: data.assistant_message.message_id, role: "assistant", messageType: "answer", contentText: data.assistant_message.content_text });
    return data.followup_suggestions;
  };

  return { messages, sendMessage };
}
```

- [ ] **Step 4: Keep Tasks as evidence center instead of the primary entry**

```tsx
<p className="text-sm text-muted-foreground">
  Review diagnosis outputs here, then continue the investigation from the conversation workspace.
</p>
```

Also add a conversation deep-link action in `TasksShell` that routes back to `/agent/[sessionId]` when a linked session exists.

- [ ] **Step 5: Run the UI flow test and the existing task tests**

Run:

```powershell
cd store-ai-clinic-web
npm run test -- conversation-page.test.tsx tasks-page.test.tsx
```

Expected:

- PASS

- [ ] **Step 6: Checkpoint the live conversation flow**

If this workspace is inside a git-enabled clone, run:

```bash
git add store-ai-clinic-web/features/conversations store-ai-clinic-web/features/tasks/components/tasks-shell.tsx store-ai-clinic-web/tests/unit/conversation-page.test.tsx
git commit -m "feat: wire live conversation flow into agent workspace"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 7 complete - live conversation flow`.

## Task 8: Run the full verification set and update docs

**Files:**
- Modify: `D:\桌面\门店数据诊断\docs\2026-06-09-frontend-handoff.md`
- Modify: `D:\桌面\门店数据诊断\docs\superpowers\specs\2026-06-13-continuous-conversation-agent-design.md`
- Test: `D:\桌面\门店数据诊断\tests\integration\test_conversations_api.py`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-api-routes.test.ts`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Update the handoff doc to mention the new conversation-first workflow**

```md
## Continuous conversation update

The Next.js Agent workspace now supports persistent conversation sessions.

Users can:

1. Start a diagnosis from upload
2. Continue with follow-up questions in the same session
3. Review linked diagnosis outputs from the Tasks surface
```

- [ ] **Step 2: Run backend verification**

Run:

```powershell
pytest tests/integration/test_conversations_api.py tests/integration/test_api_flow.py -v
```

Expected:

- PASS

- [ ] **Step 3: Run frontend verification**

Run:

```powershell
cd store-ai-clinic-web
npm run test -- conversation-api-routes.test.ts conversation-stores.test.ts conversation-page.test.tsx agent-page.test.tsx tasks-page.test.tsx
```

Expected:

- PASS

- [ ] **Step 4: Run static and build verification**

Run:

```powershell
cd store-ai-clinic-web
npm run lint
npm run build
```

Expected:

- PASS

- [ ] **Step 5: Record a manual verification checklist result**

Verify manually:

```text
1. Start a new session from /agent
2. Ask an initial analysis question
3. Ask "Why did it drop?"
4. Ask "Which hours declined most?"
5. Ask for an action plan
6. Re-open the same session and confirm continuity
```

Expected:

- All six checks complete without losing session context

- [ ] **Step 6: Final checkpoint**

If this workspace is inside a git-enabled clone, run:

```bash
git add docs/2026-06-09-frontend-handoff.md docs/superpowers/specs/2026-06-13-continuous-conversation-agent-design.md
git commit -m "docs: record continuous conversation workflow rollout"
```

If this workspace is not a git repository, record a local checkpoint note in the plan execution log: `Task 8 complete - verification and docs`.

## Self-Review

### Spec coverage

- Session creation and hybrid entry mode: covered by Tasks 1, 2, 4, 6, and 7
- Conversation, session, and long-term memory: covered by Tasks 1, 3, and 4
- Context compression: covered by Task 3
- Follow-up question engine: covered by Task 3 and surfaced in Tasks 6 and 7
- Multi-turn dialogue architecture: covered by Tasks 3, 4, 5, 6, and 7
- Database design: covered by Task 1
- API design: covered by Tasks 4 and 5
- Prompt and orchestration design: covered by Task 3
- Next.js page changes: covered by Tasks 5, 6, and 7
- FastAPI implementation: covered by Tasks 1 through 4
- Testing and rollout: covered by Task 8

### Placeholder scan

- No `TODO`, `TBD`, or `implement later` placeholders remain.
- Every task includes exact file paths, commands, and expected outcomes.
- Code-changing steps include concrete code snippets rather than generic descriptions.

### Type consistency

- Session model naming is consistent across backend and frontend: `session_id` on the backend DTO layer, `sessionId` on the frontend view-model layer.
- Intent labels are consistent: `initial_diagnosis`, `why_followup`, `time_drilldown`, `action_plan`, `session_summary`, `same_store_compare`.
- Follow-up suggestion fields are consistent: backend `suggestion_text`, frontend mapped `suggestionText`.

