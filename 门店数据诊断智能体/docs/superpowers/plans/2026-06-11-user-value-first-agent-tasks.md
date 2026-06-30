# User Value First Agent And Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove backend-facing metadata from the `Agent` and `Tasks` UI so users focus on progress, findings, and next actions instead of system internals.

**Architecture:** Keep the existing App Router structure, but split display concerns into user-facing content and internal metadata. Update the Agent and Tasks view models to expose cleaner labels, move detailed process information behind collapsible sections, and remap raw errors into calm user-language messages.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, TailwindCSS, Zustand, Vitest, Playwright, shadcn/ui primitives already in repo

---

## File Map

- Modify: `store-ai-clinic-web/features/agent/components/agent-shell.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/message-list.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/composer.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/execution-timeline.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/result-summary.tsx`
- Modify: `store-ai-clinic-web/features/agent/hooks/use-agent-submit.ts`
- Modify: `store-ai-clinic-web/entities/agent/mappers.ts`
- Modify: `store-ai-clinic-web/entities/tasks/types.ts`
- Modify: `store-ai-clinic-web/entities/tasks/mappers.ts`
- Modify: `store-ai-clinic-web/features/tasks/components/tasks-shell.tsx`
- Modify: `store-ai-clinic-web/features/tasks/components/task-list.tsx`
- Modify: `store-ai-clinic-web/features/tasks/components/diagnosis-panel.tsx`
- Modify: `store-ai-clinic-web/features/tasks/components/execution-log-panel.tsx`
- Modify: `store-ai-clinic-web/shared/ui/app-sidebar.tsx`
- Test: `store-ai-clinic-web/tests/unit/agent-page.test.tsx`
- Test: `store-ai-clinic-web/tests/unit/tasks-page.test.tsx`
- Test: `store-ai-clinic-web/tests/e2e/agent-flow.spec.ts`
- Test: `store-ai-clinic-web/tests/e2e/tasks-review.spec.ts`

### Task 1: Redesign Agent Page Around User Value

**Files:**
- Modify: `store-ai-clinic-web/tests/unit/agent-page.test.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/agent-shell.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/message-list.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/composer.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/execution-timeline.tsx`
- Modify: `store-ai-clinic-web/features/agent/components/result-summary.tsx`
- Modify: `store-ai-clinic-web/features/agent/hooks/use-agent-submit.ts`
- Modify: `store-ai-clinic-web/entities/agent/mappers.ts`

- [ ] **Step 1: Write the failing unit assertions for the user-facing Agent layout**

```tsx
it("renders an AI collaboration workspace without task ids or raw system labels", () => {
  render(<AgentPage />);

  expect(
    screen.getByRole("heading", { name: "与 AI 分析助手协作" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/当前任务/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/来源：/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/异常：/i)).not.toBeInTheDocument();
  expect(screen.getByText("查看详细过程")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the Agent unit test and verify it fails for the expected reasons**

Run: `npm run test -- tests/unit/agent-page.test.tsx`

Expected: FAIL because the current Agent page still renders the old title, task id badge, and raw status fields.

- [ ] **Step 3: Implement the minimal Agent UI refactor**

```tsx
// message-list.tsx
<span className="rounded-full ...">分析对话</span>
<article>告诉我门店发生了什么变化，我会整理成一次分析任务。</article>

// execution-timeline.tsx
<h2>当前分析</h2>
<button type="button">查看详细过程</button>

// result-summary.tsx
<h2>最新结论</h2>
<p>关键发现</p>
<p>建议动作</p>
```

- [ ] **Step 4: Add user-language error mapping before showing any submission failure**

```ts
function toUserFacingErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (/401|authentication|api key|openai|deepseek/i.test(raw)) {
    return "AI 分析服务暂时不可用，请稍后再试。";
  }
  if (/network|fetch|timeout/i.test(raw)) {
    return "网络连接暂时不稳定，请稍后重试。";
  }
  return "这次分析暂时没有完成，请稍后重新发起。";
}
```

- [ ] **Step 5: Re-run the Agent unit test and verify it passes**

Run: `npm run test -- tests/unit/agent-page.test.tsx`

Expected: PASS

### Task 2: Replace Tasks Workbench With User-Facing Task Inbox

**Files:**
- Modify: `store-ai-clinic-web/tests/unit/tasks-page.test.tsx`
- Modify: `store-ai-clinic-web/features/tasks/components/tasks-shell.tsx`
- Modify: `store-ai-clinic-web/features/tasks/components/task-list.tsx`
- Modify: `store-ai-clinic-web/features/tasks/components/diagnosis-panel.tsx`
- Modify: `store-ai-clinic-web/features/tasks/components/execution-log-panel.tsx`
- Modify: `store-ai-clinic-web/entities/tasks/types.ts`
- Modify: `store-ai-clinic-web/entities/tasks/mappers.ts`

- [ ] **Step 1: Write the failing unit assertions for the simplified Tasks view**

```tsx
it("renders a task inbox and hides raw task metadata from the main UI", () => {
  render(<TasksPage />);

  expect(screen.getByText("诊断任务")).toBeInTheDocument();
  expect(screen.getByText("任务收件箱")).toBeInTheDocument();
  expect(screen.getByText("分析结果")).toBeInTheDocument();
  expect(screen.queryByText(/执行日志/)).not.toBeInTheDocument();
  expect(screen.queryByText(/来源/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the Tasks unit test and verify it fails**

Run: `npm run test -- tests/unit/tasks-page.test.tsx`

Expected: FAIL because the current Tasks page still renders `执行日志`, task-id detail titles, and metadata fields.

- [ ] **Step 3: Implement the minimal Tasks inbox/result refactor**

```tsx
// tasks-shell.tsx
title={routeContext === "detail" ? "任务详情" : "诊断任务"}

// task-list.tsx
<div className="text-xs text-muted-foreground">
  {task.storeId} · {stageLabel(task.stage)}
</div>

// diagnosis-panel.tsx
<h2>分析结果</h2>
<p>关键发现</p>
<p>建议动作</p>

// execution-log-panel.tsx
<details>
  <summary>查看详细过程</summary>
  ...
</details>
```

- [ ] **Step 4: Split user-facing and system-facing task data in the view model**

```ts
export type TaskResultViewModel = {
  routeId: string;
  storeLabel: string;
  diagnosisTypeLabel: string;
  progressLabel: string;
  summary: {
    title: string;
    text: string;
    nextAction: string;
  };
  system: {
    source: string | null;
    error: string | null;
    stage: string;
  };
};
```

- [ ] **Step 5: Re-run the Tasks unit test and verify it passes**

Run: `npm run test -- tests/unit/tasks-page.test.tsx`

Expected: PASS

### Task 3: Align Navigation And Smoke Tests With The New UX Language

**Files:**
- Modify: `store-ai-clinic-web/shared/ui/app-sidebar.tsx`
- Modify: `store-ai-clinic-web/tests/e2e/agent-flow.spec.ts`
- Modify: `store-ai-clinic-web/tests/e2e/tasks-review.spec.ts`

- [ ] **Step 1: Write the failing smoke expectations for renamed surfaces**

```ts
await expect(page.getByRole("heading", { name: "与 AI 分析助手协作" })).toBeVisible();
await expect(page.getByText("查看详细过程")).toBeVisible();
await expect(page.getByRole("heading", { name: "诊断任务" })).toBeVisible();
```

- [ ] **Step 2: Run the focused e2e smoke tests and verify they fail**

Run: `npm run test:e2e -- tests/e2e/agent-flow.spec.ts tests/e2e/tasks-review.spec.ts`

Expected: FAIL because the page copy and structure still reflect the old execution-centric UI.

- [ ] **Step 3: Update the sidebar and visible copy to match the new product language**

```tsx
const recentTasks = [
  { id: "task-daily-001", label: "杭州西湖店 · 日诊断" },
  { id: "task-weekly-003", label: "南京东城店 · 周诊断" },
];
```

- [ ] **Step 4: Re-run the focused unit and smoke coverage**

Run: `npm run test -- tests/unit/agent-page.test.tsx tests/unit/tasks-page.test.tsx`

Run: `npm run test:e2e -- tests/e2e/agent-flow.spec.ts tests/e2e/tasks-review.spec.ts`

Expected: PASS for unit tests; e2e may still require the local dev server to be running.
