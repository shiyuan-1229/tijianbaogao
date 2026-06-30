# Quality Export Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the export page's hardcoded preview with a real backend-driven export summary for the current quality dataset.

**Architecture:** Add a backend export-summary read model that aggregates rules, assets, scan issues, and review records into deliverable sections and rule-hit stats. Then add a frontend loader that maps the summary into `QualityShell` and update the export panel to render real counts while preserving the current prototype layout.

**Tech Stack:** FastAPI, Pydantic, Python dataclasses, Next.js App Router, React, Vitest, Testing Library

---

### Task 1: Backend export summary contract

**Files:**
- Modify: `D:\桌面\AI智能体\门店数据诊断智能体\src\store_ai_clinic\schemas\quality.py`
- Test: `D:\桌面\AI智能体\门店数据诊断智能体\tests\unit\test_quality_backend.py`

- [ ] **Step 1: Write the failing backend schema/API test**

```python
response = client.get("/api/quality/exports/summary", params={"dataset_path": str(dataset)})

assert response.status_code == 200
assert response.json()["dataset_path"] == str(dataset)
assert {section["key"] for section in response.json()["sections"]} == {
    "third-batch-report",
    "non-compliant",
    "possible-compliant",
    "needs-review",
    "review-records",
    "rule-hit-stats",
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/unit/test_quality_backend.py -k export_summary -v`
Expected: FAIL because `/api/quality/exports/summary` does not exist yet.

- [ ] **Step 3: Add export summary Pydantic models**

```python
class QualityExportSection(BaseModel):
    key: str
    title: str
    item_count: int
    description: str


class QualityExportRuleHit(BaseModel):
    rule_id: str
    rule_name: str | None = None
    hit_count: int


class QualityExportSummary(BaseModel):
    dataset_path: str
    generated_at: str
    total_issues: int
    confirmed_issues: int
    rejected_issues: int
    pending_issues: int
    review_record_count: int
    evidence_image_count: int
    sections: list[QualityExportSection]
    rule_hits: list[QualityExportRuleHit]
```

- [ ] **Step 4: Run targeted test again**

Run: `pytest tests/unit/test_quality_backend.py -k export_summary -v`
Expected: FAIL because router/service logic is still missing.

### Task 2: Backend export summary aggregation

**Files:**
- Modify: `D:\桌面\AI智能体\门店数据诊断智能体\src\store_ai_clinic\services\quality.py`
- Modify: `D:\桌面\AI智能体\门店数据诊断智能体\src\store_ai_clinic\api\routers\quality.py`
- Test: `D:\桌面\AI智能体\门店数据诊断智能体\tests\unit\test_quality_backend.py`

- [ ] **Step 1: Write the failing service-level aggregation test**

```python
summary = build_quality_export_summary(dataset, now="2026-06-30T12:00:00+08:00")

assert summary.total_issues == 3
assert summary.confirmed_issues == 1
assert summary.rejected_issues == 1
assert summary.pending_issues == 1
assert summary.review_record_count == 2
assert summary.evidence_image_count == 0
assert summary.rule_hits[0].rule_id == "R-EXCEL-001"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/unit/test_quality_backend.py -k build_quality_export_summary -v`
Expected: FAIL because `build_quality_export_summary` does not exist.

- [ ] **Step 3: Implement minimal export aggregation**

```python
def build_quality_export_summary(
    dataset_path: str | Path,
    *,
    now: str | datetime | None = None,
    storage_root: str | Path | None = None,
) -> QualityExportSummary:
    asset_summary = extract_quality_asset_summary(dataset_path, now=now)
    rule_set = extract_quality_rule_set(dataset_path)
    issues = list_quality_issues(dataset_path)
    reviews = list_review_records(dataset_path=dataset_path, storage_root=storage_root)
    ...
```

- [ ] **Step 4: Expose the read endpoint**

```python
@router.get("/exports/summary", response_model=QualityExportSummary)
def get_quality_export_summary(dataset_path: str = Query(..., min_length=1)) -> QualityExportSummary:
    return QualityExportSummary.model_validate(build_quality_export_summary(dataset_path))
```

- [ ] **Step 5: Run targeted backend tests**

Run: `pytest tests/unit/test_quality_backend.py -k "export_summary or build_quality_export_summary" -v`
Expected: PASS

### Task 3: Frontend export summary loader and panel

**Files:**
- Create: `D:\桌面\AI智能体\门店数据诊断智能体\store-ai-clinic-web\features\quality\lib\default-exports.ts`
- Modify: `D:\桌面\AI智能体\门店数据诊断智能体\store-ai-clinic-web\features\quality\components\quality-shell.tsx`
- Modify: `D:\桌面\AI智能体\门店数据诊断智能体\store-ai-clinic-web\app\(workspace)\settings\page.tsx`
- Test: `D:\桌面\AI智能体\门店数据诊断智能体\store-ai-clinic-web\tests\unit\quality-shell-interactions.test.tsx`

- [ ] **Step 1: Write the failing export-panel test**

```tsx
render(<QualityShell view="export" dataset={dataset} exportSummary={summary} />);

expect(screen.getByText("问题明细")).toBeInTheDocument();
expect(screen.getByText("3 条")).toBeInTheDocument();
expect(screen.getByText("复核记录")).toBeInTheDocument();
expect(screen.getByText("2 条")).toBeInTheDocument();
expect(screen.getByText("规则命中统计")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/quality-shell-interactions.test.tsx`
Expected: FAIL because `exportSummary` prop and real summary rendering do not exist.

- [ ] **Step 3: Add loader and wire the page**

```ts
const exportSummary = await loadDefaultQualityExports();
return <QualityShell view="export" dataset={dataset} exportSummary={exportSummary} />;
```

- [ ] **Step 4: Replace hardcoded export counts with summary-driven rendering**

```tsx
const summary = exportSummary ?? fallbackExportSummary;
<EvidenceWorkspaceStat label="总问题" value={summary.totalIssues} ... />
```

- [ ] **Step 5: Run targeted frontend test**

Run: `npm test -- --run tests/unit/quality-shell-interactions.test.tsx`
Expected: PASS

### Task 4: Full verification

**Files:**
- Test: `D:\桌面\AI智能体\门店数据诊断智能体\tests\unit\test_quality_backend.py`
- Test: `D:\桌面\AI智能体\门店数据诊断智能体\store-ai-clinic-web\tests\unit\quality-shell-interactions.test.tsx`
- Test: `D:\桌面\AI智能体\门店数据诊断智能体\store-ai-clinic-web\tests\unit\settings-page.test.tsx`

- [ ] **Step 1: Run backend unit tests**

Run: `pytest tests/unit/test_quality_backend.py -v`
Expected: PASS

- [ ] **Step 2: Run frontend unit tests**

Run: `npm test -- --run tests/unit/quality-shell-interactions.test.tsx tests/unit/settings-page.test.tsx`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS
