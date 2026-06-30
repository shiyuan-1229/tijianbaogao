# Conversation Upload Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore file upload inside the current `/agent` conversation composer so users can attach report files without leaving the conversation-first workspace.

**Architecture:** Keep the page-level `ConversationShell` intact and extend the existing conversation runtime/composer path with lightweight attachment state. File selection lives in the conversation runtime store, upload summarization stays on the existing `/api/agent/upload` mock BFF, and the conversation hook composes a single posted message that includes the user text plus attachment summary.

**Tech Stack:** Next.js App Router, React, Zustand, Vitest, Testing Library, react-dropzone

---

### Task 1: Add failing runtime and page tests for conversation attachments

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Write the failing runtime store test**

```ts
it("tracks selected files and clears them independently from the draft", () => {
  const store = createConversationRuntimeStore();
  const file = new File(["daily metrics"], "daily-report.csv", {
    type: "text/csv",
  });

  store.getState().setSelectedFiles([file]);
  store.getState().setUploadError("Upload failed");
  store.getState().clearSelectedFiles();

  expect(store.getState().selectedFiles).toEqual([]);
  expect(store.getState().uploadError).toBeNull();
});
```

- [ ] **Step 2: Write the failing page render test**

```ts
it("renders the upload action in the conversation composer", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );

  const page = await AgentPage();
  render(page);

  expect(screen.getByRole("button", { name: "上传文件" })).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the targeted tests to verify they fail**

Run:

```powershell
npm run test -- conversation-stores.test.ts conversation-page.test.tsx
```

Expected: FAIL because conversation runtime store and composer do not yet expose attachment state or upload UI.

- [ ] **Step 4: Do not implement production code yet**

Wait for the red test output before changing store or UI files.

### Task 2: Add failing composer submission tests for attachment-aware sends

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Write the failing attachment submission test**

```ts
it("summarizes attached files before posting the conversation message", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify([{ session_id: "ses_001", session_title: "Session", store_id: "store-1", status: "active", entry_mode: "manual", brand_id: "brand-1" }]), { status: 200, headers: { "Content-Type": "application/json" } }))
    .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ data_source: "mock", persisted: false, total_bytes: 13, total_files: 1, files: [{ field_name: "files", name: "daily-report.csv", size: 13, type: "text/csv", last_modified: 1718000000000 }], note: "mock" }), { status: 200, headers: { "Content-Type": "application/json" } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ assistant_message: "I reviewed the attached report.", followup_suggestions: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));

  vi.stubGlobal("fetch", fetchMock);

  const page = await AgentPage();
  render(page);

  const fileInput = screen.getByLabelText("上传文件");
  await userEvent.upload(
    fileInput,
    new File(["daily metrics"], "daily-report.csv", { type: "text/csv" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "发送" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/agent/upload",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
```

- [ ] **Step 2: Write the failing file-only submission test**

```ts
it("uses a default analysis prompt when files are attached without text", async () => {
  // Arrange bootstrap + upload + post responses
  // Upload a file, leave the textarea empty, click send
  // Assert the posted conversation body contains the default prompt text
});
```

- [ ] **Step 3: Run the targeted test to verify it fails**

Run:

```powershell
npm run test -- conversation-page.test.tsx
```

Expected: FAIL because the current composer can neither upload files nor serialize them into the conversation post flow.

### Task 3: Extend conversation runtime state for attachments

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\shared\store\conversation-runtime-store.ts`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`

- [ ] **Step 1: Add minimal attachment state and setters**

```ts
type ConversationRuntimeState = {
  activeSessionId: string | null;
  composerDraft: string;
  suggestions: ConversationFollowupSuggestion[];
  isSubmitting: boolean;
  selectedFiles: File[];
  uploadError: string | null;
  setSelectedFiles: (files: File[]) => void;
  clearSelectedFiles: () => void;
  removeSelectedFile: (fileName: string) => void;
  setUploadError: (error: string | null) => void;
  // existing actions...
};
```

- [ ] **Step 2: Preserve active session on reset while clearing transient attachment state**

```ts
resetRuntime: () =>
  set((state) => ({
    ...initialState,
    activeSessionId: state.activeSessionId,
  })),
```

Where `initialState` includes:

```ts
selectedFiles: [],
uploadError: null,
```

- [ ] **Step 3: Run the store test to verify it passes**

Run:

```powershell
npm run test -- conversation-stores.test.ts
```

Expected: PASS

### Task 4: Add upload UI to the conversation composer

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\chat-composer.tsx`
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\components\conversation-shell.tsx`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Extend `ChatComposer` props for files and errors**

```ts
type ChatComposerProps = {
  value: string;
  isSubmitting?: boolean;
  files: File[];
  uploadError: string | null;
  onFilesSelected: (files: File[]) => void;
  onFileRemove: (fileName: string) => void;
  onClearUploadError: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};
```

- [ ] **Step 2: Add a lightweight inline file picker**

```tsx
<label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:border-[rgb(var(--accent))]">
  上传文件
  <input
    aria-label="上传文件"
    className="sr-only"
    multiple
    accept=".csv,.xls,.xlsx,.pdf"
    type="file"
    onChange={(event) => {
      const nextFiles = Array.from(event.target.files ?? []);
      if (nextFiles.length > 0) {
        onClearUploadError();
        onFilesSelected(nextFiles);
      }
      event.currentTarget.value = "";
    }}
  />
</label>
```

- [ ] **Step 3: Render selected files and upload errors**

```tsx
{files.length > 0 ? (
  <ul className="flex flex-wrap gap-2">
    {files.map((file) => (
      <li key={`${file.name}:${file.lastModified}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground">
        <span>{file.name}</span>
        <button type="button" onClick={() => onFileRemove(file.name)}>
          移除
        </button>
      </li>
    ))}
  </ul>
) : null}
```

And:

```tsx
{uploadError ? (
  <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    {uploadError}
  </div>
) : null}
```

- [ ] **Step 4: Wire the new props through `ConversationShell`**

```tsx
<ChatComposer
  value={composerDraft}
  isSubmitting={isSubmitting}
  files={selectedFiles}
  uploadError={uploadError}
  onFilesSelected={setSelectedFiles}
  onFileRemove={removeSelectedFile}
  onClearUploadError={() => setUploadError(null)}
  onChange={setComposerDraft}
  onSubmit={() => void sendMessage(composerDraft)}
/>
```

- [ ] **Step 5: Run the page render test to verify the upload action now passes**

Run:

```powershell
npm run test -- conversation-page.test.tsx -- --runInBand
```

Expected: render assertions pass while submission assertions may still fail.

### Task 5: Extend the conversation submit hook to summarize attachments

**Files:**
- Modify: `D:\桌面\门店数据诊断\store-ai-clinic-web\features\conversations\hooks\use-conversation-thread.ts`
- Test: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`

- [ ] **Step 1: Add minimal helpers for default prompts and upload summaries**

```ts
const DEFAULT_FILE_ONLY_PROMPT =
  "请结合我刚上传的资料，先总结关键异常，再给出下一步建议。";

function buildAttachmentSummary(uploadResponse: {
  files: { name: string; type: string; size: number }[];
}) {
  return uploadResponse.files
    .map((file) => `- ${file.name} (${file.type || "unknown"}, ${file.size} bytes)`)
    .join("\n");
}
```

- [ ] **Step 2: Upload files before posting the conversation message**

```ts
async function summarizeFiles(files: File[]) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/agent/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      "detail" in data && typeof data.detail === "string"
        ? data.detail
        : "无法准备上传资料，请稍后重试。",
    );
  }

  return data;
}
```

- [ ] **Step 3: Compose the final message body**

```ts
const normalizedMessage = trimmed || DEFAULT_FILE_ONLY_PROMPT;
const uploadSummary = selectedFiles.length > 0
  ? await summarizeFiles(selectedFiles)
  : null;

const message = uploadSummary
  ? `${normalizedMessage}\n\n已附带资料：\n${buildAttachmentSummary(uploadSummary)}`
  : normalizedMessage;
```

- [ ] **Step 4: Keep files on failure and clear them only after a successful post**

```ts
setUploadError(null);

try {
  // summarize files + post conversation
  clearSelectedFiles();
  setComposerDraft("");
} catch (error) {
  setUploadError(
    error instanceof Error ? error.message : "无法准备上传资料，请稍后重试。",
  );
} finally {
  setIsSubmitting(false);
}
```

- [ ] **Step 5: Run the attachment submission tests to verify they pass**

Run:

```powershell
npm run test -- conversation-page.test.tsx
```

Expected: PASS

### Task 6: Run focused regression verification

**Files:**
- Verify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-page.test.tsx`
- Verify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\conversation-stores.test.ts`
- Verify: `D:\桌面\门店数据诊断\store-ai-clinic-web\tests\unit\agent-upload-route.test.ts`

- [ ] **Step 1: Run focused unit tests**

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

- [ ] **Step 3: Report actual verification status**

If any command fails, stop and report the failing command plus the concrete error output before claiming completion.
