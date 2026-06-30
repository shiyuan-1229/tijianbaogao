import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { QualityShell } from "@/features/quality/components/quality-shell";
import type { QualityDatasetScan, QualityIssueData } from "@/features/quality/lib/dataset-scanner";

function issue(index: number): QualityIssueData {
  return {
    id: `issue-${index}`,
    index,
    fileName: `report-${String(index).padStart(3, "0")}.pdf`,
    group: "35-44",
    archiveId: `archive-${index}`,
    page: "1",
    issueType: "OCR 待处理",
    category: "content",
    severity: "medium",
    ruleId: "R-OCR-001",
    evidence: `第 ${index} 条分页证据`,
    aiJudgement: "需补充 OCR 证据",
    recommendation: "等待人工复核。",
    confidence: 0.7,
    status: "needs_review",
    foundAt: "2026-06-26 12:00:00",
  };
}

function datasetWithIssues(count: number): QualityDatasetScan {
  return {
    datasetPath: "D:/桌面/数据/5人",
    scannedAt: "2026-06-26T12:00:00.000Z",
    metrics: [],
    pipeline: [],
    issues: Array.from({ length: count }, (_, index) => issue(index + 1)),
  };
}

describe("quality issue pagination", () => {
  it("limits the first issue page to 20 rows and moves the next 20 rows to page 2", async () => {
    const user = userEvent.setup();

    render(<QualityShell view="issues" dataset={datasetWithIssues(81)} />);

    expect(screen.getByText("20 条/页")).toBeInTheDocument();
    expect(screen.getByText("report-001.pdf")).toBeInTheDocument();
    expect(screen.getByText("report-020.pdf")).toBeInTheDocument();
    expect(screen.queryByText("report-021.pdf")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(screen.queryByText("report-020.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("report-021.pdf")).toBeInTheDocument();
    expect(screen.getByText("report-040.pdf")).toBeInTheDocument();
    expect(screen.queryByText("report-041.pdf")).not.toBeInTheDocument();
  });
});