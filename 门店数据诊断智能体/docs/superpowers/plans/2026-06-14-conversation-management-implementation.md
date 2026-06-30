# Conversation Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ChatGPT/Claude-style conversation creation, rename, delete, auto-title, and empty-state behavior to the Next.js conversation workspace without breaking the current diagnosis flow.

**Architecture:** Keep the current conversation-first workspace and split responsibilities cleanly: backend and Next.js BFF expose conversation CRUD plus title ownership rules, TanStack Query owns remote conversation data, and Zustand keeps local UI state such as active session, draft, selected files, and dialog state. Existing message-posting routes remain in place, but new session-management flows move onto `/api/conversations`.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js App Router, React 19, TypeScript, Zustand, TanStack Query, Radix/shadcn-style UI primitives, Vitest, Testing Library, pytest

---

## File Map

### Backend

- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\models\conversations.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\schemas\conversations.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_sessions.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_messages.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\api\routers\conversations.py`
- Modify: `D:\桌面\门店数据诊断\tests\unit\services\test_conversation_sessions.py`
- Modify: `D:\桌面\门店数据诊断\tests\integration\test_conversations_api.py`

### Next.js BFF and data layer

- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\package.json`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\providers.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\api\endpoints.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\api\client.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\route.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\[id]\route.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\types.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\mappers.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversations-query.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-api-routes.test.ts`

### Frontend state and UI

- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-runtime-store.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-list-store.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-session-list.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversation-thread.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-shell.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-sidebar.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-item.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-menu.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\create-conversation-button.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\delete-conversation-dialog.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-empty-state.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\button.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\input.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\dropdown-menu.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\alert-dialog.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-sidebar.test.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

---

### Task 1: Backend conversation title ownership and CRUD service

**Files:**
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\models\conversations.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\schemas\conversations.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_sessions.py`
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\services\conversation_messages.py`
- Modify: `D:\桌面\门店数据诊断\tests\unit\services\test_conversation_sessions.py`

- [ ] **Step 1: Write the failing backend unit tests for default titles, rename, and delete**

```python
def test_create_session_uses_default_system_title_when_question_missing(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="",
    )

    assert session.session_title == "新诊断会话"
    assert session.title_source == "system"


def test_create_session_generates_short_title_from_first_question(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="分析杭州西湖店日报",
    )

    assert session.session_title == "杭州西湖店日报诊断"
    assert session.title_source == "system"


def test_rename_session_marks_title_as_user_owned(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="分析杭州西湖店日报",
    )

    renamed = rename_session(
        db_session,
        session_id=session.session_id,
        session_title="西湖店日报重点诊断",
    )

    assert renamed.session_title == "西湖店日报重点诊断"
    assert renamed.title_source == "user"


def test_append_message_updates_default_title_only_for_system_owned_blank_session(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="",
    )

    append_message(
        db_session,
        session_id=session.session_id,
        role="user",
        message_type="question",
        content_text="比较杭州和南京门店表现",
    )
    db_session.refresh(session)

    assert session.session_title == "门店经营对比分析"
    assert session.title_source == "system"


def test_delete_session_removes_session_and_messages(db_session):
    session = create_session(
        db_session,
        brand_id="brand-acme",
        store_id="store-a",
        entry_mode="manual",
        initial_question="分析杭州西湖店日报",
    )
    message = append_message(
        db_session,
        session_id=session.session_id,
        role="user",
        message_type="question",
        content_text="帮我看日报异常",
    )

    deleted = delete_session(db_session, session_id=session.session_id)

    assert deleted is True
    assert db_session.get(AgentSession, session.session_id) is None
    assert db_session.get(AgentMessage, message.message_id) is None
```

- [ ] **Step 2: Run the targeted backend unit tests to verify RED**

Run: `.\.venv\Scripts\python.exe -m pytest tests\unit\services\test_conversation_sessions.py -q`

Expected: FAIL with missing `title_source`, missing `rename_session` / `delete_session`, or wrong title assertions.

- [ ] **Step 3: Implement minimal model, schema, and service changes**

```python
# src/store_ai_clinic/models/conversations.py
title_source: Mapped[str] = mapped_column(String(20), nullable=False, default="system")
```

```python
# src/store_ai_clinic/schemas/conversations.py
class CreateSessionRequest(BaseModel):
    brand_id: str
    store_id: str
    entry_mode: Literal["manual", "auto_from_diagnosis"]
    initial_question: str = ""
    session_title: str | None = None
    diagnosis_type_hint: DiagnosisType | None = None


class UpdateSessionRequest(BaseModel):
    session_title: str

    @field_validator("session_title")
    @classmethod
    def _trim_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("must not be empty")
        return trimmed


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    session_title: str
    title_source: Literal["system", "user"]
    status: Literal["active", "archived", "closed"]
    entry_mode: Literal["manual", "auto_from_diagnosis"]
    brand_id: str
    store_id: str
```

```python
# src/store_ai_clinic/services/conversation_sessions.py
DEFAULT_SESSION_TITLE = "新诊断会话"


def build_session_title(question: str) -> str:
    text = question.strip()
    if not text:
        return DEFAULT_SESSION_TITLE
    if ("比较" in text or "对比" in text) and "门店" in text:
        return "门店经营对比分析"
    if "日报" in text and "店" in text:
        store_name = text.split("日报", 1)[0].replace("分析", "").strip()
        return f"{store_name}日报诊断"[:20]
    if "周报" in text and "店" in text:
        store_name = text.split("周报", 1)[0].replace("分析", "").strip()
        return f"{store_name}周报诊断"[:20]
    return text[:20]


def create_session(
    db: Session,
    *,
    brand_id: str,
    store_id: str,
    entry_mode: str,
    initial_question: str = "",
    session_title: str | None = None,
    diagnosis_type_hint: str | None = None,
) -> AgentSession:
    resolved_title = session_title.strip() if session_title else build_session_title(initial_question)
    title_source = "user" if session_title and session_title.strip() else "system"
    session = AgentSession(
        session_id=str(uuid4()),
        brand_id=brand_id,
        store_id=store_id,
        session_title=resolved_title,
        title_source=title_source,
        entry_mode=entry_mode,
        status="active",
        diagnosis_type_hint=diagnosis_type_hint,
    )
    db.add(session)
    db.flush()
    db.refresh(session)
    return session


def rename_session(db: Session, *, session_id: str, session_title: str) -> AgentSession:
    session = db.get(AgentSession, session_id)
    if session is None:
        raise ValueError(f"Unknown session_id: {session_id}")
    session.session_title = session_title.strip()
    session.title_source = "user"
    db.flush()
    db.refresh(session)
    return session


def delete_session(db: Session, *, session_id: str) -> bool:
    session = db.get(AgentSession, session_id)
    if session is None:
        return False
    db.delete(session)
    db.flush()
    return True
```

```python
# src/store_ai_clinic/services/conversation_messages.py
if role == "user" and session.title_source == "system" and session.session_title == DEFAULT_SESSION_TITLE:
    session.session_title = build_session_title(content_text or "")
```

- [ ] **Step 4: Run the targeted backend unit tests to verify GREEN**

Run: `.\.venv\Scripts\python.exe -m pytest tests\unit\services\test_conversation_sessions.py -q`

Expected: PASS with all session service tests green.

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/models/conversations.py src/store_ai_clinic/schemas/conversations.py src/store_ai_clinic/services/conversation_sessions.py src/store_ai_clinic/services/conversation_messages.py tests/unit/services/test_conversation_sessions.py
git commit -m "feat: add conversation title ownership service rules"
```

### Task 2: Backend conversation CRUD API

**Files:**
- Modify: `D:\桌面\门店数据诊断\src\store_ai_clinic\api\routers\conversations.py`
- Modify: `D:\桌面\门店数据诊断\tests\integration\test_conversations_api.py`

- [ ] **Step 1: Write failing integration tests for `/api/conversations` CRUD**

```python
def test_create_conversation_endpoint_supports_blank_session(conversation_db):
    client = TestClient(app)

    response = client.post(
        "/api/conversations",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
        },
    )

    assert response.status_code == 201
    assert response.json()["session_title"] == "新诊断会话"
    assert response.json()["title_source"] == "system"


def test_patch_conversation_endpoint_renames_session(conversation_db):
    client = TestClient(app)
    created = client.post(
        "/api/conversations",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "分析杭州西湖店日报",
        },
    ).json()

    response = client.patch(
        f"/api/conversations/{created['session_id']}",
        json={"session_title": "西湖店日报重点诊断"},
    )

    assert response.status_code == 200
    assert response.json()["session_title"] == "西湖店日报重点诊断"
    assert response.json()["title_source"] == "user"


def test_delete_conversation_endpoint_returns_204(conversation_db):
    client = TestClient(app)
    created = client.post(
        "/api/conversations",
        json={
            "brand_id": "brand-acme",
            "store_id": "store-a",
            "entry_mode": "manual",
            "initial_question": "分析杭州西湖店日报",
        },
    ).json()

    response = client.delete(f"/api/conversations/{created['session_id']}")

    assert response.status_code == 204
    assert client.get("/api/conversations").status_code == 200
    assert client.get("/api/conversations").json() == []
```

- [ ] **Step 2: Run the integration tests to verify RED**

Run: `.\.venv\Scripts\python.exe -m pytest tests\integration\test_conversations_api.py -q`

Expected: FAIL with `404` or missing `PATCH` / `DELETE` handlers on `/api/conversations`.

- [ ] **Step 3: Implement the new FastAPI CRUD routes**

```python
# src/store_ai_clinic/api/routers/conversations.py
@router.get("", response_model=list[SessionResponse])
def list_conversations(
    store_id: Annotated[str | None, Query(min_length=1)] = None,
    db: Session = Depends(get_db),
) -> list[SessionResponse]:
    return [SessionResponse.model_validate(session) for session in list_sessions(db, store_id=store_id)]


@router.post("", response_model=SessionResponse, status_code=201)
def create_conversation(
    request: CreateSessionRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = create_session(
        db,
        brand_id=request.brand_id,
        store_id=request.store_id,
        entry_mode=request.entry_mode,
        initial_question=request.initial_question,
        session_title=request.session_title,
        diagnosis_type_hint=request.diagnosis_type_hint,
    )
    db.commit()
    db.refresh(session)
    return SessionResponse.model_validate(session)


@router.patch("/{session_id}", response_model=SessionResponse)
def update_conversation(
    session_id: str,
    request: UpdateSessionRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    try:
        session = rename_session(
            db,
            session_id=session_id,
            session_title=request.session_title,
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    db.commit()
    return SessionResponse.model_validate(session)


@router.delete("/{session_id}", status_code=204)
def remove_conversation(
    session_id: str,
    db: Session = Depends(get_db),
) -> Response:
    deleted = delete_session(db, session_id=session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Unknown session_id: {session_id}")
    db.commit()
    return Response(status_code=204)
```

- [ ] **Step 4: Re-run the integration tests to verify GREEN**

Run: `.\.venv\Scripts\python.exe -m pytest tests\integration\test_conversations_api.py -q`

Expected: PASS with conversation CRUD and message tests all green.

- [ ] **Step 5: Commit**

```bash
git add src/store_ai_clinic/api/routers/conversations.py tests/integration/test_conversations_api.py
git commit -m "feat: add conversation CRUD api routes"
```

### Task 3: Next.js API client and BFF conversation CRUD routes

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\api\endpoints.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\api\client.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\route.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\api\conversations\[id]\route.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-api-routes.test.ts`

- [ ] **Step 1: Write failing BFF tests for list, create, rename, and delete**

```typescript
it("lists conversations from the backend service", async () => {
  getMock.mockResolvedValue([
    {
      session_id: "ses_001",
      session_title: "新诊断会话",
      title_source: "system",
      status: "active",
      entry_mode: "manual",
      brand_id: "brand-acme",
      store_id: "store-a",
    },
  ]);

  const { GET } = await import("@/app/api/conversations/route");
  const response = await GET(
    new Request("http://localhost/api/conversations?store_id=store-a"),
  );

  expect(response.status).toBe(200);
});


it("patches a conversation title through the backend service", async () => {
  patchMock.mockResolvedValue({
    session_id: "ses_001",
    session_title: "西湖店日报重点诊断",
    title_source: "user",
    status: "active",
    entry_mode: "manual",
    brand_id: "brand-acme",
    store_id: "store-a",
  });

  const { PATCH } = await import("@/app/api/conversations/[id]/route");
  const response = await PATCH(
    new Request("http://localhost/api/conversations/ses_001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_title: "西湖店日报重点诊断" }),
    }),
    { params: Promise.resolve({ id: "ses_001" }) },
  );

  expect(response.status).toBe(200);
});


it("deletes a conversation through the backend service", async () => {
  deleteMock.mockResolvedValue(undefined);

  const { DELETE } = await import("@/app/api/conversations/[id]/route");
  const response = await DELETE(
    new Request("http://localhost/api/conversations/ses_001", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "ses_001" }) },
  );

  expect(response.status).toBe(204);
});
```

- [ ] **Step 2: Run the BFF tests to verify RED**

Run: `npm run test -- conversation-api-routes.test.ts`

Expected: FAIL because `/api/conversations` route files and `patch/delete` client methods do not exist yet.

- [ ] **Step 3: Implement API client helpers and conversation BFF routes**

```typescript
// shared/api/endpoints.ts
export const endpoints = {
  diagnosisRun: "/api/diagnosis/run",
  onboardingPreview: "/api/onboarding/template-preview",
  batchPreview: "/api/batches/preview",
  conversations: "/api/conversations",
  conversationSessions: "/api/conversations/sessions",
  knowledgeSources: "/api/knowledge/sources",
} as const;
```

```typescript
// shared/api/client.ts
patch<TResponse, TBody extends RequestBody = RequestBody>(
  path: string,
  body?: TBody,
  init: Omit<RequestJsonOptions, "body" | "method"> = {},
) {
  return this.request<TResponse>(path, { ...init, method: "PATCH", body });
},
delete<TResponse>(
  path: string,
  init: Omit<RequestJsonOptions, "method"> = {},
) {
  return this.request<TResponse>(path, { ...init, method: "DELETE" });
},
```

```typescript
// app/api/conversations/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id")?.trim();
  const path = storeId
    ? `${endpoints.conversations}?store_id=${encodeURIComponent(storeId)}`
    : endpoints.conversations;
  const response = await serverApiClient.get(path, {
    cache: "no-store",
    timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS,
  });
  return NextResponse.json(response, { status: 200 });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const response = await serverApiClient.post(endpoints.conversations, payload, {
    cache: "no-store",
    timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS,
  });
  return NextResponse.json(response, { status: 201 });
}
```

```typescript
// app/api/conversations/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await request.json();
  const response = await serverApiClient.patch(
    `${endpoints.conversations}/${encodeURIComponent(id)}`,
    payload,
    { cache: "no-store", timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS },
  );
  return NextResponse.json(response, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await serverApiClient.delete(
    `${endpoints.conversations}/${encodeURIComponent(id)}`,
    { cache: "no-store", timeoutMs: CONVERSATION_ROUTE_TIMEOUT_MS },
  );
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Re-run the BFF tests to verify GREEN**

Run: `npm run test -- conversation-api-routes.test.ts`

Expected: PASS with all conversation route handlers green.

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/shared/api/endpoints.ts store-ai-clinic-web/shared/api/client.ts store-ai-clinic-web/app/api/conversations/route.ts store-ai-clinic-web/app/api/conversations/[id]/route.ts store-ai-clinic-web/tests/unit/conversation-api-routes.test.ts
git commit -m "feat: add next conversation CRUD bff routes"
```

### Task 4: TanStack Query bootstrap and conversation query hooks

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\package.json`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\providers.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\types.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\mappers.ts`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversations-query.ts`

- [ ] **Step 1: Add a failing provider/query hook test**

```typescript
it("loads conversations through TanStack Query and maps titleSource", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify([
        {
          session_id: "ses_001",
          session_title: "新诊断会话",
          title_source: "system",
          status: "active",
          entry_mode: "manual",
          brand_id: "brand-acme",
          store_id: "store-a",
        },
      ]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  const { result } = renderHook(() => useConversationsQuery("store-a"), {
    wrapper: TestQueryProvider,
  });

  await waitFor(() => {
    expect(result.current.data?.[0].titleSource).toBe("system");
  });
});
```

- [ ] **Step 2: Run the frontend tests to verify RED**

Run: `npm run test -- conversation-stores.test.ts conversation-page.test.tsx`

Expected: FAIL because `@tanstack/react-query` and `useConversationsQuery` are not wired yet.

- [ ] **Step 3: Install Query support and create the hook**

```json
// package.json
"dependencies": {
  "@tanstack/react-query": "^5.59.0"
}
```

```tsx
// app/providers.tsx
"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

```typescript
// entities/conversations/types.ts
export type ConversationTitleSource = "system" | "user";

export type ConversationSessionSummaryDto = {
  session_id: string;
  session_title: string;
  title_source: ConversationTitleSource;
  status: ConversationSessionStatus;
  entry_mode: ConversationEntryMode;
  brand_id: string;
  store_id: string;
};

export type ConversationSessionSummary = {
  sessionId: string;
  sessionTitle: string;
  titleSource: ConversationTitleSource;
  status: ConversationSessionStatus;
  entryMode?: ConversationEntryMode;
  brandId?: string;
  storeId: string;
};
```

```typescript
// features/conversations/hooks/use-conversations-query.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useConversationsQuery(storeId?: string) {
  return useQuery({
    queryKey: ["conversations", { storeId: storeId ?? null }],
    queryFn: async () => {
      const search = storeId ? `?store_id=${encodeURIComponent(storeId)}` : "";
      const response = await fetch(`/api/conversations${search}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load conversations.");
      }
      const data = (await response.json()) as ConversationSessionSummaryDto[];
      return mapConversationSessionSummaries(data);
    },
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("创建会话失败，请稍后重试");
      }
      return mapConversationSessionSummary(await response.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
```

- [ ] **Step 4: Run the provider/query tests to verify GREEN**

Run: `npm run test -- conversation-stores.test.ts conversation-page.test.tsx`

Expected: PASS with no provider or query-client errors.

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/package.json store-ai-clinic-web/app/providers.tsx store-ai-clinic-web/entities/conversations/types.ts store-ai-clinic-web/entities/conversations/mappers.ts store-ai-clinic-web/features/conversations/hooks/use-conversations-query.ts
git commit -m "feat: add query support for conversation management"
```

### Task 5: Sidebar UI primitives and empty-state rendering

**Files:**
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\button.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\input.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\dropdown-menu.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\components\ui\alert-dialog.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-sidebar.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-item.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-menu.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\create-conversation-button.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\delete-conversation-dialog.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-empty-state.tsx`
- Create: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-sidebar.test.tsx`

- [ ] **Step 1: Write failing sidebar and empty-state tests**

```typescript
it("renders the welcome empty state when there are no conversations", () => {
  render(
    <ConversationEmptyState onCreate={() => undefined} />
  );

  expect(screen.getByText("欢迎使用门店AI分析助手")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "创建第一个诊断会话" }),
  ).toBeInTheDocument();
});


it("renders the conversation list with create button and overflow menu trigger", () => {
  render(
    <ConversationSidebar
      sessions={[
        {
          sessionId: "ses_001",
          sessionTitle: "西湖店日报诊断",
          titleSource: "system",
          storeId: "store-a",
          status: "active",
        },
      ]}
      activeSessionId="ses_001"
      onCreate={() => undefined}
      onSelectSession={() => undefined}
      onRenameSession={() => undefined}
      onDeleteSession={() => undefined}
    />,
  );

  expect(screen.getByRole("button", { name: "+ 新建会话" })).toBeInTheDocument();
  expect(screen.getByText("西湖店日报诊断")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "会话操作" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the sidebar tests to verify RED**

Run: `npm run test -- conversation-sidebar.test.tsx`

Expected: FAIL because the new UI primitives and conversation sidebar components do not exist yet.

- [ ] **Step 3: Implement the shadcn-style primitives and sidebar components**

```tsx
// components/ui/button.tsx
import * as React from "react";
import { cn } from "@/shared/lib/cn";

export function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
        "bg-[rgb(var(--accent))] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
```

```tsx
// features/conversations/components/conversation-empty-state.tsx
import { Button } from "@/components/ui/button";

export function ConversationEmptyState({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-dashed border-border bg-white/82 p-8 text-center shadow-[var(--shadow-soft)]">
      <h2 className="text-2xl font-semibold text-foreground">欢迎使用门店AI分析助手</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        你可以上传日报、上传周报、提出经营问题，获取诊断建议。
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
        <span>上传日报</span>
        <span>上传周报</span>
        <span>提出经营问题</span>
        <span>获取诊断建议</span>
      </div>
      <Button className="mt-6" onClick={onCreate}>
        创建第一个诊断会话
      </Button>
    </section>
  );
}
```

```tsx
// features/conversations/components/create-conversation-button.tsx
import { Button } from "@/components/ui/button";

export function CreateConversationButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return <Button onClick={onClick}>+ 新建会话</Button>;
}
```

```tsx
// features/conversations/components/conversation-sidebar.tsx
export function ConversationSidebar(props: ConversationSidebarProps) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">会话列表</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            围绕同一门店问题保留连续上下文，方便继续追问和回看诊断。
          </p>
        </div>
        <CreateConversationButton onClick={props.onCreate} />
      </div>

      <div className="mt-4 space-y-3">
        {props.sessions.length > 0 ? (
          props.sessions.map((session) => (
            <ConversationItem
              key={session.sessionId}
              session={session}
              active={session.sessionId === props.activeSessionId}
              onSelect={() => props.onSelectSession(session.sessionId)}
              onRename={(title) => props.onRenameSession(session.sessionId, title)}
              onDelete={() => props.onDeleteSession(session.sessionId)}
            />
          ))
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-border bg-[rgb(var(--surface-secondary))] px-4 py-5 text-sm leading-6 text-muted-foreground">
            还没有历史会话。你可以先创建一个诊断会话开始分析。
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Re-run the sidebar tests to verify GREEN**

Run: `npm run test -- conversation-sidebar.test.tsx`

Expected: PASS with new sidebar and empty-state rendering verified.

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/components/ui store-ai-clinic-web/features/conversations/components/conversation-sidebar.tsx store-ai-clinic-web/features/conversations/components/conversation-item.tsx store-ai-clinic-web/features/conversations/components/conversation-menu.tsx store-ai-clinic-web/features/conversations/components/create-conversation-button.tsx store-ai-clinic-web/features/conversations/components/delete-conversation-dialog.tsx store-ai-clinic-web/features/conversations/components/conversation-empty-state.tsx store-ai-clinic-web/tests/unit/conversation-sidebar.test.tsx
git commit -m "feat: add conversation sidebar management ui"
```

### Task 6: Local UI state, dialogs, rename, and delete flows

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-runtime-store.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-list-store.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-session-list.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`

- [ ] **Step 1: Write failing store tests for dialog and rename state**

```typescript
it("tracks pending create confirmation and delete target session", () => {
  const store = createConversationRuntimeStore();

  store.getState().setPendingCreateConfirm(true);
  store.getState().setDeleteTargetSessionId("ses_001");
  store.getState().setRenamingSessionId("ses_002");

  expect(store.getState().pendingCreateConfirm).toBe(true);
  expect(store.getState().deleteTargetSessionId).toBe("ses_001");
  expect(store.getState().renamingSessionId).toBe("ses_002");
});
```

- [ ] **Step 2: Run the store tests to verify RED**

Run: `npm run test -- conversation-stores.test.ts`

Expected: FAIL because the new runtime state setters and fields do not exist yet.

- [ ] **Step 3: Implement the new local UI state**

```typescript
// shared/store/conversation-runtime-store.ts
type ConversationRuntimeState = {
  activeSessionId: string | null;
  composerDraft: string;
  suggestions: ConversationFollowupSuggestion[];
  isSubmitting: boolean;
  selectedFiles: File[];
  uploadError: string | null;
  pendingCreateConfirm: boolean;
  deleteTargetSessionId: string | null;
  renamingSessionId: string | null;
  setPendingCreateConfirm: (value: boolean) => void;
  setDeleteTargetSessionId: (sessionId: string | null) => void;
  setRenamingSessionId: (sessionId: string | null) => void;
  ...
};

const initialState = {
  activeSessionId: null,
  composerDraft: "",
  suggestions: [],
  isSubmitting: false,
  selectedFiles: [],
  uploadError: null,
  pendingCreateConfirm: false,
  deleteTargetSessionId: null,
  renamingSessionId: null,
};

setPendingCreateConfirm: (pendingCreateConfirm) => set({ pendingCreateConfirm }),
setDeleteTargetSessionId: (deleteTargetSessionId) => set({ deleteTargetSessionId }),
setRenamingSessionId: (renamingSessionId) => set({ renamingSessionId }),
```

- [ ] **Step 4: Re-run the store tests to verify GREEN**

Run: `npm run test -- conversation-stores.test.ts`

Expected: PASS with runtime state additions verified.

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/shared/store/conversation-runtime-store.ts store-ai-clinic-web/shared/store/conversation-list-store.ts store-ai-clinic-web/features/conversations/hooks/use-session-list.ts store-ai-clinic-web/tests/unit/conversation-stores.test.ts
git commit -m "feat: add conversation management runtime state"
```

### Task 7: Conversation shell wiring for create, rename, delete, empty state, and first-send behavior

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversation-thread.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-shell.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\(workspace)\agent\page.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\app\(workspace)\agent\[sessionId]\page.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Write failing page tests for new-session confirmation, delete fallback, and empty state**

```typescript
it("opens a confirmation dialog before creating a new session when there is unsent draft content", async () => {
  const page = await AgentPage();
  render(page);

  await userEvent.type(
    screen.getByRole("textbox", { name: "继续追问" }),
    "分析今天的门店日报",
  );
  await userEvent.click(screen.getByRole("button", { name: "+ 新建会话" }));

  expect(screen.getByText("是否创建新会话？")).toBeInTheDocument();
  expect(screen.getByText("当前会话内容将保留。")).toBeInTheDocument();
});


it("renders the welcome empty state when no sessions exist", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );

  const page = await AgentPage();
  render(page);

  expect(screen.getByText("欢迎使用门店AI分析助手")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the page tests to verify RED**

Run: `npm run test -- conversation-page.test.tsx`

Expected: FAIL because `ConversationShell` does not yet render the new sidebar button, confirmation dialog, or empty-state component.

- [ ] **Step 3: Wire the conversation shell and thread hooks**

```tsx
// features/conversations/components/conversation-shell.tsx
const hasNoSessions = sessions.length === 0 && !fallbackSessionId;

return (
  <div className="space-y-6">
    <PageHeader
      eyebrow="对话智能体"
      title="持续对话诊断工作区"
      description="围绕同一门店问题持续追问、比较和沉淀整改方案，让诊断从一次性输出升级为连续经营对话。"
    />

    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <ConversationSidebar ... />

      {hasNoSessions ? (
        <ConversationEmptyState onCreate={handleCreateConversation} />
      ) : (
        <div className="space-y-4 rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
          <ConversationThread messages={messages} />
          <ChatComposer ... />
        </div>
      )}

      <MemoryReferencePanel>
        <FollowupSuggestionChips suggestions={suggestions} />
      </MemoryReferencePanel>
    </div>

    <DeleteConversationDialog ... />
  </div>
);
```

```typescript
// features/conversations/hooks/use-conversation-thread.ts
if (!targetSessionId) {
  const sessionDto = await createConversation({
    brand_id: DEFAULT_SESSION_BRAND_ID,
    store_id: DEFAULT_SESSION_STORE_ID,
    entry_mode: "manual",
    initial_question: normalizedMessage,
  });
  ...
}
```

```tsx
// app/(workspace)/agent/page.tsx
const sessionsDto = await safeFetchJson<ConversationSessionSummaryDto[]>(
  "/api/conversations",
);
```

- [ ] **Step 4: Re-run the page tests to verify GREEN**

Run: `npm run test -- conversation-page.test.tsx`

Expected: PASS with explicit new-session flow and empty state behavior verified.

- [ ] **Step 5: Commit**

```bash
git add store-ai-clinic-web/features/conversations/hooks/use-conversation-thread.ts store-ai-clinic-web/features/conversations/components/conversation-shell.tsx store-ai-clinic-web/app/(workspace)/agent/page.tsx store-ai-clinic-web/app/(workspace)/agent/[sessionId]/page.tsx store-ai-clinic-web/tests/unit/conversation-page.test.tsx
git commit -m "feat: wire conversation shell session management"
```

### Task 8: Full regression verification

**Files:**
- Modify: `D:\桌面\门店数据诊断\docs\2026-06-09-frontend-handoff.md`
- Modify: `D:\桌面\门店数据诊断\docs\superpowers\specs\2026-06-14-conversation-management-design.md` only if behavior changed during implementation

- [ ] **Step 1: Run the frontend unit test suite**

Run: `npm run test`

Expected: PASS with conversation route, store, sidebar, and page tests green.

- [ ] **Step 2: Run the frontend lint and build checks**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Run the backend conversation tests**

Run: `.\.venv\Scripts\python.exe -m pytest tests\unit\services\test_conversation_sessions.py tests\integration\test_conversations_api.py -q`

Expected: PASS

- [ ] **Step 4: Update the handoff doc with the new session-management status**

```md
## 13. 2026-06-14 Conversation Management Update

What is now live:

1. Explicit `+ 新建会话` flow
2. Inline rename and delete actions in the conversation sidebar
3. Empty-state welcome panel for first-session creation
4. Rule-based auto-title generation with user-title protection via `title_source`
```

- [ ] **Step 5: Commit**

```bash
git add docs/2026-06-09-frontend-handoff.md docs/superpowers/specs/2026-06-14-conversation-management-design.md
git commit -m "docs: record conversation management rollout"
```

---

## Self-Review

### Spec coverage

Covered requirements:

1. New conversation flow: Task 5 and Task 7
2. Delete flow and active-session fallback: Task 2, Task 5, Task 7
3. Auto-title and 20-character rule: Task 1
4. Manual rename with `Enter` / `Esc` / blur: Task 5 and Task 7
5. Empty state: Task 5 and Task 7
6. `/api/conversations` CRUD: Task 2 and Task 3
7. Zustand state additions: Task 6
8. TanStack Query adoption: Task 4
9. Error handling and regression coverage: Task 3, Task 7, Task 8

No uncovered spec items remain.

### Placeholder scan

The plan avoids `TODO`, `TBD`, and "implement later" placeholders. Each code-changing task includes concrete file paths, test examples, commands, and minimal code direction.

### Type consistency

The plan uses:

1. `title_source` on backend DTOs and frontend DTOs
2. `titleSource` on frontend mapped entities
3. `/api/conversations` for CRUD
4. `/api/conversations/sessions/[id]/messages` for message history and posting

These names are consistent across tasks.
