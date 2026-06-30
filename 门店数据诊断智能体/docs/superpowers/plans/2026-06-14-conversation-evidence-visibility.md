# Conversation Evidence Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded file evidence visibly persist under the user message that used those files in the current conversation workspace.

**Architecture:** Extend the frontend-only `ConversationMessage` shape with optional local evidence metadata and render that metadata in the conversation thread. Keep backend DTOs unchanged; only locally appended user messages get evidence attached after upload summarization succeeds.

**Tech Stack:** Next.js App Router, React, Zustand, Vitest, Testing Library

---

### Task 1: Add failing tests for evidence rendering

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Write the failing evidence rendering assertion in the attachment send test**

```ts
await waitFor(() => {
  expect(screen.getByText("本轮附带资料")).toBeInTheDocument();
});
expect(screen.getByText("daily-report.csv")).toBeInTheDocument();
expect(screen.getByText(/text\/csv/i)).toBeInTheDocument();
```

- [ ] **Step 2: Add a focused thread rendering test case**

```ts
it("renders evidence metadata under a user message", () => {
  render(
    <ConversationThread
      messages={[
        {
          messageId: "msg_user_001",
          role: "user",
          messageType: "question",
          contentText: "Please review this report.",
          evidenceFiles: [
            {
              name: "daily-report.csv",
              size: 13,
              type: "text/csv",
            },
          ],
        },
      ]}
    />,
  );

  expect(screen.getByText("本轮附带资料")).toBeInTheDocument();
  expect(screen.getByText("daily-report.csv")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```powershell
npm run test -- conversation-page.test.tsx
```

Expected: FAIL because the conversation thread does not yet render evidence cards.

### Task 2: Extend frontend conversation message types for local evidence

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\types.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\entities\conversations\mappers.ts`

- [ ] **Step 1: Add a local evidence file type**

```ts
export type ConversationEvidenceFile = {
  name: string;
  size: number;
  type: string;
};
```

- [ ] **Step 2: Extend `ConversationMessage` with optional evidence**

```ts
export type ConversationMessage = {
  messageId: string;
  role: ConversationMessageRole;
  messageType: string;
  contentText: string;
  evidenceFiles?: ConversationEvidenceFile[];
};
```

- [ ] **Step 3: Keep DTO mapping unchanged**

```ts
export function mapConversationMessage(
  dto: ConversationMessageDto,
): ConversationMessage {
  return {
    messageId: dto.message_id,
    role: dto.role,
    messageType: dto.message_type,
    contentText: dto.content_text ?? "",
  };
}
```

- [ ] **Step 4: Do not add evidence to backend DTO shapes**

Keep evidence frontend-local only.

### Task 3: Attach local evidence to appended user messages

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversation-thread.ts`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Build structured evidence from upload summaries**

```ts
function mapUploadSummaryToEvidence(uploadResponse: UploadSummaryResponse) {
  return uploadResponse.files.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
  }));
}
```

- [ ] **Step 2: Attach evidence to the locally appended user message**

```ts
const evidenceFiles = uploadSummary
  ? mapUploadSummaryToEvidence(uploadSummary)
  : undefined;

appendMessage({
  messageId: createDraftMessageId("user"),
  role: "user",
  messageType: "question",
  contentText: message,
  evidenceFiles,
});
```

- [ ] **Step 3: Keep assistant messages unchanged**

```ts
appendMessage({
  messageId: createDraftMessageId("assistant"),
  role: "assistant",
  messageType: "answer",
  contentText: data.assistant_message,
});
```

- [ ] **Step 4: Run the page test to verify the attachment send test passes**

Run:

```powershell
npm run test -- conversation-page.test.tsx
```

Expected: evidence assertions now pass.

### Task 4: Render the evidence card in the conversation thread

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-thread.tsx`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Render evidence only for user messages with files**

```tsx
{message.role === "user" && message.evidenceFiles?.length ? (
  <div className="mt-3 rounded-[1.25rem] border border-white/70 bg-white/70 px-3 py-3">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      本轮附带资料
    </p>
    <ul className="mt-2 space-y-2 text-sm text-foreground">
      {message.evidenceFiles.map((file) => (
        <li key={`${file.name}:${file.size}:${file.type}`} className="rounded-[1rem] bg-white/80 px-3 py-2">
          <p className="font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {file.type || "unknown"} · {file.size} bytes
          </p>
        </li>
      ))}
    </ul>
  </div>
) : null}
```

- [ ] **Step 2: Keep empty-state and assistant rendering intact**

Do not change the message list order or empty-state behavior.

- [ ] **Step 3: Run the focused tests**

Run:

```powershell
npm run test -- conversation-page.test.tsx
```

Expected: PASS

### Task 5: Final verification

**Files:**
- Verify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`
- Verify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`
- Verify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\agent-upload-route.test.ts`

- [ ] **Step 1: Run focused regression tests**

Run:

```powershell
npm run test -- conversation-page.test.tsx conversation-stores.test.ts agent-upload-route.test.ts
```

Expected: PASS

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS

- [ ] **Step 3: Report actual verification evidence**

If anything fails, report the exact command and failure before claiming success.
