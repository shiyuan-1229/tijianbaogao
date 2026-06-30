# Rules Library Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the `/knowledge` quality rules library page to match the provided screenshot while preserving the default `QualityShell` rules view.

**Architecture:** Add a `rulesVariant="screenshot"` prop to `QualityShell`, matching the existing screenshot-variant pattern for issues, detail, and review. `/knowledge` opts into this variant; default `view="rules"` remains unchanged for existing behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, Browser visual verification.

---

### Task 1: Add Screenshot Rule Library Assertions

**Files:**
- Modify: `store-ai-clinic-web/tests/unit/knowledge-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions for screenshot-only structure:

```tsx
expect(screen.getByRole("button", { name: "导入需求文档" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "新增规则" })).toBeInTheDocument();
expect(screen.getByText("规则分类")).toBeInTheDocument();
expect(screen.getByText("脱敏风险")).toBeInTheDocument();
expect(screen.getByText("页数与格式")).toBeInTheDocument();
expect(screen.getByText("内容完整性")).toBeInTheDocument();
expect(screen.getByText("历史对比")).toBeInTheDocument();
expect(screen.getByText("规则列表")).toBeInTheDocument();
expect(screen.getByText("规则详情")).toBeInTheDocument();
expect(screen.getByText("失败条件")).toBeInTheDocument();
expect(screen.getByText("保存规则说明")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/knowledge-page.test.tsx`

Expected: FAIL because screenshot-only actions and category panels are not rendered yet.

### Task 2: Implement `rulesVariant`

**Files:**
- Modify: `store-ai-clinic-web/features/quality/components/quality-shell.tsx`
- Modify: `store-ai-clinic-web/app/(workspace)/knowledge/page.tsx`

- [ ] **Step 1: Add prop and route opt-in**

Add `type RulesVariant = "default" | "screenshot";`, accept `rulesVariant = "default"` in `QualityShell`, and return `RulesLibrarySnapshotPage` only when `view === "rules" && rulesVariant === "screenshot"`.

Update `/knowledge/page.tsx`:

```tsx
return <QualityShell view="rules" dataset={dataset} rulesVariant="screenshot" />;
```

- [ ] **Step 2: Add screenshot page component**

Create `RulesLibrarySnapshotPage` inside `quality-shell.tsx` with:

- Header: `规则库`, subtitle, `导入需求文档`, `新增规则`.
- Left panel: `规则分类` with four category cards and counts.
- Center panel: `规则列表`, search input, five rule rows, and teal bar chart.
- Right panel: `规则详情`, `来源`, `失败条件`, `检测方法`, `人工复核要求`, `保存规则说明`.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run test -- tests/unit/knowledge-page.test.tsx`

Expected: PASS.

### Task 3: Regression And Visual Check

**Files:**
- Existing test suite and local browser preview.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test -- tests/unit/knowledge-page.test.tsx tests/unit/brands-page.test.tsx tests/unit/inspection-redesign.test.tsx tests/unit/quality-shell-interactions.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: build exits with code 0.

- [ ] **Step 3: Browser visual verification**

Open `http://localhost:3004/knowledge` at 1365x768 and verify the page has no horizontal overflow and the three content columns are visible.