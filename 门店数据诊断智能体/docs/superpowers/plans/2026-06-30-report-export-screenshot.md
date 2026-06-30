# Report Export Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the `/settings` report export page to match the provided screenshot while preserving the default export panel behavior.

**Architecture:** Add an `exportVariant="screenshot"` prop to `QualityShell`, matching the existing screenshot-variant pattern for issues, detail, review, and rules. `/settings` opts into the screenshot variant; default `view="export"` remains unchanged for existing interaction tests.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, Browser visual verification.

---

### Task 1: Add Screenshot Report Export Assertions

**Files:**
- Modify: `store-ai-clinic-web/tests/unit/settings-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Assert screenshot-only structure: header actions `预览交付包` and `导出结果`, panels `交付物选择`, `导出预览`, `导出记录`, deliverables including `证据截图索引`, metrics `总问题`, `已确认`, `待复核`, `争议`, table rows `风险摘要`, `问题明细`, `复核记录`, `规则统计`, `证据索引`, status chips `完成`, `复核版`, `草稿`, and button `生成交付包`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/settings-page.test.tsx`

Expected: FAIL because screenshot-only actions and panels are absent.

### Task 2: Implement Export Screenshot Variant

**Files:**
- Modify: `store-ai-clinic-web/features/quality/components/quality-shell.tsx`
- Modify: `store-ai-clinic-web/app/(workspace)/settings/page.tsx`

- [ ] **Step 1: Add prop and route opt-in**

Add `type ExportVariant = "default" | "screenshot";`, accept `exportVariant = "default"` in `QualityShell`, and return `ReportExportSnapshotPage` only when `view === "export" && exportVariant === "screenshot"`.

Update `/settings/page.tsx` to pass `exportVariant="screenshot"`.

- [ ] **Step 2: Add screenshot page component**

Create `ReportExportSnapshotPage` inside `quality-shell.tsx` with a screenshot-like header and three panels: deliverable checklist, export preview metrics/table, and export history/config/action.

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run test -- tests/unit/settings-page.test.tsx`

Expected: PASS.

### Task 3: Regression And Visual Check

**Files:**
- Existing tests and local browser preview.

- [ ] **Step 1: Run focused tests**

Run: `npm run test -- tests/unit/settings-page.test.tsx tests/unit/knowledge-page.test.tsx tests/unit/brands-page.test.tsx tests/unit/inspection-redesign.test.tsx tests/unit/quality-shell-interactions.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: build exits with code 0.

- [ ] **Step 3: Browser visual verification**

Open `http://127.0.0.1:3000/settings` at 1365x768 and verify the page has no horizontal overflow and the three content panels are visible.