# Manual Review Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the `/brands` human review page to match the provided screenshot while preserving the default `QualityShell` review path for existing interaction tests.

**Architecture:** Add a `reviewVariant="screenshot"` prop to `QualityShell`, mirroring the existing `issueListVariant` and `reportDetailVariant` pattern. `/brands` opts into the screenshot variant, while the default `review` view keeps the current queue and evidence behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, lucide-react, Vitest, Testing Library.

---

### Task 1: Add Screenshot Review Assertions

**Files:**
- Modify: `store-ai-clinic-web/tests/unit/brands-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Update the existing `/brands` page test to assert the screenshot-specific structure:

```tsx
expect(screen.getByText("待我复核")).toBeInTheDocument();
expect(screen.getByText("已驳回")).toBeInTheDocument();
expect(screen.getByText("复核队列")).toBeInTheDocument();
expect(screen.getByText("当前问题证据")).toBeInTheDocument();
expect(screen.getByText("复核决策")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "只看高风险" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "保存复核记录" })).toBeInTheDocument();
expect(screen.getByText("王五_体检报告.pdf")).toBeInTheDocument();
expect(screen.getByText("XX体检中心检验报告单")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/brands-page.test.tsx`

Expected: FAIL because `复核队列`, `当前问题证据`, and `保存复核记录` are not all present in the current simplified review view.

### Task 2: Implement `reviewVariant`

**Files:**
- Modify: `store-ai-clinic-web/features/quality/components/quality-shell.tsx`
- Modify: `store-ai-clinic-web/app/(workspace)/brands/page.tsx`

- [ ] **Step 1: Add prop and route opt-in**

Add `type ReviewVariant = "default" | "screenshot";`, accept `reviewVariant = "default"` in `QualityShell`, and render the screenshot component only when `view === "review" && reviewVariant === "screenshot"`.

Update `/brands/page.tsx`:

```tsx
return <QualityShell view="review" dataset={dataset} reviewVariant="screenshot" />;
```

- [ ] **Step 2: Add screenshot page component**

Create `ManualReviewSnapshotPage` inside `quality-shell.tsx` with:

- Header: `人工复核`, subtitle, `只看高风险`, `保存复核记录`.
- Four stats: `待我复核 12`, `争议问题 3`, `已确认 9`, `已驳回 2`.
- Three columns: `复核队列`, `当前问题证据`, `复核决策`.
- Decision buttons wired to `onReviewDecision("confirmed" | "rejected" | "disputed")`.
- Status feedback rendered when `reviewFeedback` is present.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run test -- tests/unit/brands-page.test.tsx`

Expected: PASS.

### Task 3: Regression Check

**Files:**
- Existing page and interaction tests only.

- [ ] **Step 1: Run focused regression tests**

Run:

```bash
npm run test -- tests/unit/brands-page.test.tsx tests/unit/inspection-redesign.test.tsx tests/unit/quality-shell-interactions.test.tsx
```

Expected: PASS. If `quality-shell-interactions` fails, keep the default `review` branch unchanged and adjust only the screenshot variant.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: build exits with code 0.

