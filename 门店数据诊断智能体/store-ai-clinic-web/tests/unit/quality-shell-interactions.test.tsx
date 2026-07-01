import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QualityShell } from "@/features/quality/components/quality-shell";
import type { QualityDatasetScan, QualityIssueData } from "@/features/quality/lib/dataset-scanner";

function issue(overrides: Partial<QualityIssueData> & Pick<QualityIssueData, "id" | "index" | "fileName">): QualityIssueData {
  return {
    group: "35-44",
    archiveId: overrides.fileName.replace(/\.pdf$/, ""),
    page: "1",
    issueType: "OCR \u5f85\u5904\u7406",
    category: "content",
    severity: "medium",
    ruleId: "R-OCR-001",
    evidence: `${overrides.fileName} \u7684\u8bc1\u636e`,
    aiJudgement: "\u9700\u8865\u5145 OCR \u8bc1\u636e",
    recommendation: "\u7b49\u5f85\u4eba\u5de5\u590d\u6838\u3002",
    confidence: 0.7,
    status: "needs_review",
    foundAt: "2026-06-26 12:00:00",
    ...overrides,
  };
}

function emptyExportHistoryResponse() {
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetchWithExportHistory(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes("/api/quality/exports") && init?.method !== "POST") {
      return Promise.resolve(emptyExportHistoryResponse());
    }
    return Promise.resolve(handler(url, init));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const dataset: QualityDatasetScan = {
  datasetPath: "D:/\u684c\u9762/\u6570\u636e/5\u4eba",
  scannedAt: "2026-06-26T12:00:00.000Z",
  metrics: [],
  pipeline: [],
  issues: [
    issue({ id: "high-open", index: 1, fileName: "high-open.pdf", severity: "high", status: "needs_review" }),
    issue({ id: "medium-confirmed", index: 2, fileName: "medium-confirmed.pdf", severity: "medium", status: "confirmed" }),
    issue({ id: "low-rejected", index: 3, fileName: "low-rejected.pdf", severity: "low", status: "rejected" }),
  ],
};

describe("quality workspace interactions", () => {
  it("renders age-group coverage in both dataset details and KPI cards", () => {
    render(
      <QualityShell
        view="batch"
        dataset={{
          ...dataset,
          metrics: [
            { label: "年龄段", value: "5", icon: "people", color: "teal" },
            { label: "PDF", value: "28", icon: "pdf", color: "blue" },
            { label: "Excel", value: "5", icon: "excel", color: "green" },
            { label: "问题", value: "37", icon: "warning", color: "orange" },
            { label: "待复核", value: "12", icon: "review", color: "red" },
          ],
        }}
      />,
    );

    expect(within(screen.getByLabelText("数据集详情")).getByText("年龄段：5")).toBeInTheDocument();
    expect(screen.getByLabelText("质检指标")).toBeInTheDocument();
    expect(screen.queryByText("高优先级问题")).not.toBeInTheDocument();
  });
  it("renders the real asset inventory summary in batch view", () => {
    render(
      <QualityShell
        view="batch"
        dataset={dataset}
        assetSummary={{
          datasetPath: dataset.datasetPath,
          scannedAt: "2026-06-30T12:00:00.000Z",
          totalGroups: 5,
          totalArchives: 12,
          totalPdfFiles: 31,
          totalExcelFiles: 5,
          matchedArchives: 8,
          missingPdfArchives: 2,
          missingExcelArchives: 1,
          underThreeVisitArchives: 3,
          assets: [],
        }}
      />,
    );

    expect(screen.getByText("总文件数")).toBeInTheDocument();
    expect(within(screen.getByLabelText("检测总览")).getByText("31")).toBeInTheDocument();
    expect(screen.getByText("总档案数")).toBeInTheDocument();
    expect(within(screen.getByLabelText("数据资产盘点")).getByText(/共 12 份档案/)).toBeInTheDocument();
  });
  it("shows detection flow after the import cleaning panel", () => {
    render(
      <QualityShell
        view="batch"
        dataset={{
          ...dataset,
          metrics: [
            { label: "PDF", value: "28", icon: "pdf", color: "blue" },
            { label: "Excel", value: "5", icon: "excel", color: "green" },
            { label: "问题", value: "37", icon: "warning", color: "orange" },
            { label: "待复核", value: "12", icon: "review", color: "red" },
          ],
        }}
      />,
    );

    const importHeading = screen.getByRole("heading", { name: "导入体检报告数据" });
    const detectionFlow = screen.getByLabelText("检测流程");
    const overviewChart = screen.getByText("体检数据质量分布");

    expect(importHeading.compareDocumentPosition(detectionFlow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(detectionFlow.compareDocumentPosition(overviewChart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("renders the screenshot workflow while keeping internal status chrome hidden", () => {
    render(
      <QualityShell
        view="batch"
        dataset={{
          ...dataset,
          metrics: [
            { label: "年龄段", value: "5", icon: "people", color: "teal" },
            { label: "PDF", value: "28", icon: "pdf", color: "blue" },
            { label: "Excel", value: "5", icon: "excel", color: "green" },
            { label: "问题", value: "37", icon: "warning", color: "orange" },
            { label: "待复核", value: "12", icon: "review", color: "red" },
          ],
          pipeline: [
            { label: "文件扫描", value: "15/15", done: true, active: false },
            { label: "Excel 解析", value: "5/5", done: true, active: false },
            { label: "PDF 转图", value: "0/15", done: false, active: true },
            { label: "AI 评审", value: "待开始", done: false, active: false },
            { label: "人工复核", value: "待开始", done: false, active: false },
          ],
        }}
      />,
    );

    expect(screen.getByText("文件扫描")).toBeInTheDocument();
    expect(screen.getByText("Excel 解析")).toBeInTheDocument();
    expect(screen.getByText("PDF 转图")).toBeInTheDocument();
    expect(screen.getByText("AI 评审")).toBeInTheDocument();
    expect(screen.getByText("人工复核")).toBeInTheDocument();
    expect(screen.queryByText(/当前数据集/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/agent\.md/u)).not.toBeInTheDocument();
  });
  it("renders severity and review status as semantic colored badges", () => {
    render(<QualityShell view="detail" dataset={dataset} />);

    expect(screen.getByLabelText("严重程度：高")).toHaveClass("bg-[#fff1f2]", "text-[#dc2626]");
    expect(screen.getByLabelText("严重程度：中")).toHaveClass("bg-[#eff6ff]", "text-[#1d4ed8]");
    expect(screen.getByLabelText("严重程度：低")).toHaveClass("bg-[#ecfdf3]", "text-[#15803d]");
    expect(screen.getByLabelText("处理状态：待复核")).toHaveClass("bg-[#fff7ed]", "text-[#ea580c]");
    expect(screen.getByLabelText("处理状态：已确认")).toHaveClass("bg-[#ecfdf3]", "text-[#15803d]");
    expect(screen.getByLabelText("处理状态：已驳回")).toHaveClass("bg-[#f7f9fb]", "text-[#5e6978]");
  });
  it("uses styled filter menus instead of native select dropdowns", async () => {
    const user = userEvent.setup();
    render(<QualityShell view="issues" dataset={dataset} />);

    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryByLabelText("问题类型")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "筛选" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "问题类型：全部" }));
    await user.click(screen.getByRole("menuitem", { name: "疑似缺字" }));
    expect(screen.getByRole("button", { name: "问题类型：疑似缺字" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "严重程度：全部" }));
    await user.click(screen.getByRole("menuitem", { name: "高" }));
    expect(screen.getByText("high-open.pdf")).toBeInTheDocument();
    expect(screen.queryByText("medium-confirmed.pdf")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "处理状态：全部" }));
    await user.click(screen.getByRole("menuitem", { name: "已确认" }));
    expect(screen.getByText("当前筛选条件下暂无质检问题。")).toBeInTheDocument();
  });
  it("makes toolbar, dataset, filters, and evidence panel controls interactive", async () => {
    const user = userEvent.setup();
    render(<QualityShell view="issues" dataset={dataset} />);

    await user.click(screen.getByRole("button", { name: "\u6682\u505c\u4efb\u52a1" }));
    expect(screen.getByRole("button", { name: "\u7ee7\u7eed\u4efb\u52a1" })).toBeInTheDocument();
    expect(screen.getByText("\u4efb\u52a1\u5df2\u6682\u505c\uff0c\u5f53\u524d\u7ed3\u679c\u4fdd\u6301\u53ef\u590d\u6838\u3002")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "\u91cd\u65b0\u8fd0\u884c" }));
    expect(screen.getByText(/\u5df2\u91cd\u65b0\u8fd0\u884c\u68c0\u6d4b\u6d41\u7a0b/u)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /D:\/\u684c\u9762\/\u6570\u636e\/5\u4eba/u }));
    await user.click(screen.getByRole("button", { name: "\u5386\u53f2\u5bf9\u6bd4\u6837\u672c" }));
    expect(screen.getByText("已切换数据集：历史对比样本")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "严重程度：全部" }));
    await user.click(screen.getByRole("menuitem", { name: "高" }));
    expect(screen.getByText("high-open.pdf")).toBeInTheDocument();
    expect(screen.queryByText("medium-confirmed.pdf")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "处理状态：全部" }));
    await user.click(screen.getByRole("menuitem", { name: "已确认" }));
    expect(screen.getByText("\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6682\u65e0\u8d28\u68c0\u95ee\u9898\u3002")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "严重程度：高" }));
    await user.click(screen.getByRole("menuitem", { name: "全部" }));
    expect(screen.getByText("medium-confirmed.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "\u5173\u95ed\u8bc1\u636e\u8be6\u60c5" }));
    expect(screen.queryByLabelText("\u5f53\u524d\u95ee\u9898\u8bc1\u636e")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "medium-confirmed.pdf" }));
    expect(screen.getByLabelText("\u5f53\u524d\u95ee\u9898\u8bc1\u636e")).toBeInTheDocument();
  });


  it("records screenshot page button actions through backend APIs", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "已记录操作：测试动作" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<QualityShell view="issues" issueListVariant="screenshot" dataset={dataset} />);

    await user.click(screen.getByRole("button", { name: "批量标记" }));
    await user.click(screen.getByRole("button", { name: "进入详情" }));
    await user.click(screen.getByRole("button", { name: "筛选" }));
    await user.click(screen.getByRole("button", { name: "查看单报告详情" }));

    cleanup();
    render(<QualityShell view="detail" reportDetailVariant="screenshot" dataset={dataset} />);

    await user.click(screen.getByRole("button", { name: "上一份" }));
    await user.click(screen.getByRole("button", { name: "下一份" }));
    await user.click(screen.getByRole("button", { name: "进入人工复核" }));
    await user.click(screen.getByRole("button", { name: "提交到人工复核" }));

    cleanup();
    render(<QualityShell view="review" reviewVariant="screenshot" dataset={dataset} />);

    await user.click(screen.getByRole("button", { name: "只看高风险" }));
    await user.click(screen.getByRole("button", { name: "保存复核记录" }));

    cleanup();
    render(<QualityShell view="rules" rulesVariant="screenshot" dataset={dataset} />);

    await user.click(screen.getByRole("button", { name: "导入需求文档" }));
    await user.click(screen.getByRole("button", { name: "新增规则" }));
    await user.click(screen.getByRole("button", { name: "保存规则说明" }));

    const ruleStatusButton = screen.getAllByRole("button").find((button) => {
      const label = button.getAttribute("aria-label") ?? "";
      return label.includes("R-") && !button.textContent?.includes("R-");
    });
    expect(ruleStatusButton).toBeDefined();
    await user.click(ruleStatusButton!);
    const actionCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/quality/actions");
    expect(actionCalls).toHaveLength(14);
    expect(actionCalls.map(([, init]) => JSON.parse(String((init as RequestInit).body)).action)).toEqual([
      "batch_mark_issues",
      "open_report_detail",
      "apply_issue_filters",
      "open_report_detail",
      "previous_report",
      "next_report",
      "open_manual_review",
      "submit_to_manual_review",
      "filter_high_risk_reviews",
      "save_review_records",
      "import_requirement_document",
      "create_rule_draft",
      "save_rule_description",
      "toggle_rule_status",
    ]);
  });
  it("renders extracted requirement rules in the rule library", async () => {
    const user = userEvent.setup();
    render(
      <QualityShell
        view="rules"
        dataset={dataset}
        rules={{
          datasetPath: dataset.datasetPath,
          sourceDocument: "D:/桌面/数据/体检报告需求.docx",
          rules: [
            {
              ruleId: "R-REQ-008",
              ruleName: "体检总结完整性",
              source: "D:/桌面/数据/体检报告需求.docx",
              dimension: "总结完整性",
              checkTarget: "PDF 报告",
              passCondition: "报告包含可读的体检总结。",
              failCondition: "缺少总结，或总结区裁切、缺字、不可读。",
              severity: "high",
              detectMethod: "PDF 页面视觉识别 + OCR/人工复核",
              needHumanReview: true,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("规则来源：体检报告需求.docx")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /R-REQ-008/ }));
    expect(screen.getByText("体检总结完整性")).toBeInTheDocument();
    expect(screen.getByText("PDF 页面视觉识别 + OCR/人工复核")).toBeInTheDocument();
    expect(screen.getByText("需要人工复核")).toBeInTheDocument();
  });
  it("renders real export summary metrics from backend data", () => {
    render(
      <QualityShell
        view="export"
        dataset={dataset}
        exportSummary={{
          datasetPath: dataset.datasetPath,
          generatedAt: "2026-06-30T12:00:00.000Z",
          totalIssues: 3,
          confirmedIssues: 1,
          rejectedIssues: 1,
          pendingIssues: 1,
          reviewRecordCount: 2,
          evidenceImageCount: 4,
          sections: [
            { key: "third-batch-report", title: "第三批数据检测报告", itemCount: 1, description: "覆盖 1 个年龄段、1 份档案、3 个问题。" },
            { key: "non-compliant", title: "不合规问题清单", itemCount: 1, description: "人工已确认的问题。" },
            { key: "possible-compliant", title: "可能合规清单", itemCount: 1, description: "人工已驳回的问题。" },
            { key: "needs-review", title: "需人工复核清单", itemCount: 1, description: "仍待人工确认的问题。" },
            { key: "review-records", title: "人工复核记录", itemCount: 2, description: "真实复核记录。" },
            { key: "rule-hit-stats", title: "规则命中统计", itemCount: 3, description: "命中 3 条规则。" },
          ],
          ruleHits: [
            { ruleId: "R-EXCEL-001", ruleName: "字段缺失", hitCount: 1 },
            { ruleId: "R-FORMAT-002", ruleName: "页数边界", hitCount: 1 },
            { ruleId: "R-OCR-001", ruleName: "OCR 待处理", hitCount: 1 },
          ],
        }}
      />,
    );

    expect(screen.getByLabelText("报告导出工作台")).toBeInTheDocument();
    expect(screen.getByText("总问题")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("交付物选择")).toBeInTheDocument();
    expect(screen.getAllByText("第三批数据检测报告").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("覆盖 1 个年龄段、1 份档案、3 个问题。")).toBeInTheDocument();
  });
  it("makes rule library cards and export workspace interactive", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/quality/exports") && init?.method === "POST") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: "export-zip",
                message: "已生成交付包：quality-export.zip，包含 5 个文件。",
                download_url: "/api/quality/exports/export-zip/download",
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }
        if (url.includes("/api/quality/exports")) {
          return Promise.resolve(emptyExportHistoryResponse());
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }),
    );

    const { rerender } = render(<QualityShell view="rules" dataset={dataset} />);
    await user.click(screen.getByRole("button", { name: /R-FILE-001/ }));
    expect(screen.getByText("\u89c4\u5219\u8be6\u60c5")).toBeInTheDocument();
    expect(screen.getByText(/PDF \+ \u7ed3\u6784\u5316\u6570\u636e/u)).toBeInTheDocument();

    rerender(<QualityShell view="export" dataset={dataset} />);
    expect(screen.getByLabelText("报告导出工作台")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "生成交付包" }));
    expect(await screen.findByText(/已生成交付包/u)).toBeInTheDocument();
  });

  it("supports the five redesigned quality workspace interactions", async () => {
    const user = userEvent.setup();
    const exportFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/quality/exports") && init?.method !== "POST") {
        return Promise.resolve(emptyExportHistoryResponse());
      }
      return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "export-abc123",
          export_type: "第三批数据检测报告",
          dataset_path: dataset.datasetPath,
          status: "done",
          message: "已生成交付包：quality-export-export-abc123.zip，包含 8 个文件。",
          created_at: "2026-06-30T12:00:00+08:00",
          bundle_name: "quality-export-export-abc123.zip",
          bundle_path: "D:/tmp/quality-export-export-abc123.zip",
          download_url: "/api/quality/exports/export-abc123/download",
          artifact_count: 8,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
      );
    });
    vi.stubGlobal("fetch", exportFetch);

    render(<QualityShell view="export" dataset={dataset} />);

    expect(screen.getByLabelText("报告导出工作台")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "证据截图索引" }));
    expect(screen.getByText("已选 8 / 9 项")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "生成交付包" }));

    expect(await screen.findByText("已生成交付包：quality-export-export-abc123.zip，包含 8 个文件。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "下载最近交付包" })).toHaveAttribute("href", "/api/quality/exports/export-abc123/download");
    expect(exportFetch).toHaveBeenCalledWith(
      "/api/quality/exports",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"selected_sections"'),
      }),
    );
  });
  it("keeps long evidence text out of the report preview", () => {
    render(<QualityShell view="detail" dataset={dataset} />);

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByText("规则依据")).toBeInTheDocument();
    expect(within(evidencePanel).getByText(/high-open\.pdf 的证据/u)).toBeInTheDocument();
    expect(within(evidencePanel).queryByText(/当前命中/u)).not.toBeInTheDocument();
  });
  it("shows visible evidence-panel feedback and updates issue status after a review decision", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/quality/exports") {
        return Promise.resolve(emptyExportHistoryResponse());
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<QualityShell view="detail" dataset={dataset} />);

    await user.click(screen.getByRole("button", { name: "\u786e\u8ba4\u95ee\u9898" }));

    const evidencePanel = screen.getByLabelText("\u5f53\u524d\u95ee\u9898\u8bc1\u636e");
    expect(within(evidencePanel).getByRole("status")).toHaveTextContent("\u5df2\u8bb0\u5f55\uff1a\u4eba\u5de5\u786e\u8ba4\u8be5\u95ee\u9898\u6210\u7acb");
    expect(screen.getByRole("row", { name: /high-open\.pdf.*\u5df2\u786e\u8ba4/u })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/quality/reviews",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"issue_id":"high-open"'),
      }),
    );
  });
  it("shows disputed review decisions as marked disputed status", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<QualityShell view="detail" dataset={dataset} />);

    await user.click(screen.getByRole("button", { name: "标记争议" }));

    expect(screen.getByRole("row", { name: /high-open\.pdf.*标记争议/u })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /high-open\.pdf.*AI 评审/u })).not.toBeInTheDocument();
  });
  it("lets users import source files and start a data-cleaning task", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchWithExportHistory((url, init) => {
      if (url.includes("/api/quality/import") && !url.includes("/scan") && (init?.method === "POST" || init?.body instanceof FormData)) {
        return new Response(
          JSON.stringify({
            data_source: "backend",
            persisted: true,
            task_id: "quality-import-abc123",
            dataset_path: "data/quality/imports/quality-import-abc123",
            total_bytes: 34,
            total_files: 2,
            files: [
              {
                field_name: "files",
                name: "门店日报.csv",
                size: 12,
                type: "text/csv",
                saved_path: "data/quality/imports/quality-import-abc123/门店日报.csv",
              },
              {
                field_name: "files",
                name: "体检报告.pdf",
                size: 22,
                type: "application/pdf",
                saved_path: "data/quality/imports/quality-import-abc123/体检报告.pdf",
              },
            ],
            note: "Files were persisted for quality scanning.",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      if (url.includes("/api/quality/import/quality-import-abc123/scan") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            task_id: "quality-import-abc123",
            dataset_path: "data/quality/imports/quality-import-abc123",
            status: "done",
            message: "Quality scan completed.",
            scan: { issues: [] },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<QualityShell view="batch" dataset={dataset} />);

    await user.upload(screen.getByLabelText("选择待清洗文件"), [
      new File(["daily-store"], "门店日报.csv", { type: "text/csv" }),
      new File(["pdf-report-content"], "体检报告.pdf", { type: "application/pdf" }),
    ]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/quality/import"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });
    expect(await screen.findByText(/已导入 2 个文件/)).toBeInTheDocument();
    expect(screen.getByText("门店日报.csv")).toBeInTheDocument();
    expect(screen.getByText("体检报告.pdf")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/quality/import"),
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );

    await user.click(screen.getByRole("button", { name: "开始数据清洗" }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/quality/import/quality-import-abc123/scan"),
      expect.objectContaining({ method: "POST" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("数据清洗任务已完成：2 个文件完成目录扫描，发现 0 个疑似问题。");
  });
  it("summarizes cleaned data errors and privacy leaks in the batch result area", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchWithExportHistory((url, init) => {
      if (url.includes("/api/quality/import") && !url.includes("/scan") && (init?.method === "POST" || init?.body instanceof FormData)) {
        return new Response(
          JSON.stringify({
            data_source: "backend",
            persisted: true,
            task_id: "quality-import-findings123",
            dataset_path: "data/quality/imports/quality-import-findings123",
            total_bytes: 42,
            total_files: 2,
            files: [
              {
                field_name: "files",
                name: "结构化数据.xlsx",
                size: 20,
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                saved_path: "data/quality/imports/quality-import-findings123/结构化数据.xlsx",
              },
              {
                field_name: "files",
                name: "体检报告.pdf",
                size: 22,
                type: "application/pdf",
                saved_path: "data/quality/imports/quality-import-findings123/体检报告.pdf",
              },
            ],
            note: "Files were persisted for quality scanning.",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/api/quality/import/quality-import-findings123/scan") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            task_id: "quality-import-findings123",
            dataset_path: "data/quality/imports/quality-import-findings123",
            status: "done",
            message: "Quality scan completed.",
            scan: {
              issues: [
                {
                  id: "r-excel-001",
                  index: 1,
                  file_name: "结构化数据.xlsx",
                  group: "",
                  archive_id: "02496166",
                  page: "Excel",
                  issue_type: "结构化异常项",
                  category: "content",
                  severity: "medium",
                  rule_id: "R-EXCEL-002",
                  evidence: "ItemResultChar 命中异常标记。",
                  ai_judgement: "Excel 字段提示异常",
                  recommendation: "关联对应 PDF 页面和 OCR 证据后进入人工复核。",
                  confidence: 0.82,
                  status: "needs_review",
                  found_at: "2026-06-27 12:00:00",
                },
                {
                  id: "r-privacy-001",
                  index: 2,
                  file_name: "体检报告.pdf",
                  group: "",
                  archive_id: "02496166",
                  page: "1",
                  issue_type: "疑似未脱敏",
                  category: "privacy",
                  severity: "high",
                  rule_id: "R-PRIVACY-003",
                  evidence: "报告首页出现完整姓名和证件号。",
                  ai_judgement: "疑似未脱敏个人身份信息",
                  recommendation: "进入人工复核，不自动涂抹或修改 PDF。",
                  confidence: 0.91,
                  status: "needs_review",
                  found_at: "2026-06-27 12:00:00",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<QualityShell view="batch" dataset={dataset} />);

    await user.upload(screen.getByLabelText("选择待清洗文件"), [
      new File(["sheet"], "结构化数据.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      new File(["pdf"], "体检报告.pdf", { type: "application/pdf" }),
    ]);
    await waitFor(() => expect(screen.getByText(/已导入 2 个文件/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "开始数据清洗" }));

    expect(screen.getByRole("status")).toHaveTextContent("数据清洗任务已完成：2 个文件完成目录扫描，发现 2 个疑似问题。");
    expect(screen.queryByLabelText("清洗结果")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("当前问题证据")).not.toBeInTheDocument();
  });
  it("selects real vision findings ahead of OCR placeholders after cleaning", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchWithExportHistory((url, init) => {
      if (url.includes("/api/quality/import") && !url.includes("/scan") && (init?.method === "POST" || init?.body instanceof FormData)) {
        return new Response(
          JSON.stringify({
            data_source: "backend",
            persisted: true,
            task_id: "quality-import-priority123",
            dataset_path: "data/quality/imports/quality-import-priority123",
            total_bytes: 22,
            total_files: 1,
            files: [
              {
                field_name: "files",
                name: "体检报告.pdf",
                size: 22,
                type: "application/pdf",
                saved_path: "data/quality/imports/quality-import-priority123/体检报告.pdf",
              },
            ],
            note: "Files were persisted for quality scanning.",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/api/quality/import/quality-import-priority123/scan") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            task_id: "quality-import-priority123",
            dataset_path: "data/quality/imports/quality-import-priority123",
            status: "done",
            message: "Quality scan completed.",
            scan: {
              issues: [
                {
                  id: "r-ocr-placeholder",
                  index: 1,
                  file_name: "体检报告.pdf",
                  group: "",
                  archive_id: "02496166",
                  page: "1",
                  issue_type: "OCR 待处理",
                  category: "content",
                  severity: "medium",
                  rule_id: "R-OCR-001",
                  evidence: "已保留 PDF 文件、页数和路径证据，等待 OCR 或视觉模型生成页面级文字证据。",
                  ai_judgement: "需要补充 OCR 证据",
                  recommendation: "不猜测 PDF 文字内容，接入 OCR/视觉模型后再生成内容级判断。",
                  confidence: 0.7,
                  status: "needs_review",
                  found_at: "2026-06-27 12:00:00",
                },
                {
                  id: "r-vision-format",
                  index: 2,
                  file_name: "体检报告.pdf",
                  group: "",
                  archive_id: "02496166",
                  page: "1",
                  issue_type: "页面方向异常",
                  category: "format",
                  severity: "medium",
                  rule_id: "R-VISION-001",
                  evidence: "首页内容存在旋转，需要人工复核扫描方向。",
                  ai_judgement: "AI 判断首页存在页面方向异常，但这不是内容级数据错误。",
                  recommendation: "复核扫描方向。",
                  confidence: 0.86,
                  status: "needs_review",
                  found_at: "2026-06-27 12:00:00",
                  preview_image_urls: [
                    "/api/quality/pdf-pages/report-page-1.jpg",
                    "/api/quality/pdf-pages/report-page-2.jpg",
                  ],
                  preview_page_count: 2,
                  finding_type: "format",
                },
                {
                  id: "r-vision-real",
                  index: 3,
                  file_name: "体检报告.pdf",
                  group: "",
                  archive_id: "02496166",
                  page: "2",
                  issue_type: "P波时限负值",
                  category: "content",
                  severity: "high",
                  rule_id: "R-VISION-001",
                  evidence: "参数区显示 P波时限:-114 ms，时间长度不应为负值。",
                  ai_judgement: "AI 基于第二页可见参数判断该字段存在内容级数据错误，需要人工复核原始报告。",
                  recommendation: "定位第二页框选参数，回查 PDF 与结构化字段后确认。",
                  confidence: 0.92,
                  status: "needs_review",
                  found_at: "2026-06-27 12:00:00",
                  preview_image_urls: [
                    "/api/quality/pdf-pages/report-page-1.jpg",
                    "/api/quality/pdf-pages/report-page-2.jpg",
                  ],
                  preview_page_count: 2,
                  finding_type: "data_error",
                  bbox: [82, 77, 6, 4],
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<QualityShell view="batch" dataset={dataset} />);

    await user.upload(screen.getByLabelText("选择待清洗文件"), [
      new File(["pdf"], "体检报告.pdf", { type: "application/pdf" }),
    ]);
    await waitFor(() => expect(screen.getByText(/已导入 1 个文件/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "开始数据清洗" }));

    expect(screen.getByRole("status")).toHaveTextContent(/发现 3 个疑似问题/);
    expect(screen.queryByLabelText("当前问题证据")).not.toBeInTheDocument();

    cleanup();
    render(
      <QualityShell
        view="detail"
        dataset={{
          ...dataset,
          issues: [
            issue({
              id: "r-vision-real",
              index: 3,
              fileName: "体检报告.pdf",
              page: "2",
              issueType: "P波时限负值",
              category: "content",
              severity: "high",
              ruleId: "R-VISION-001",
              evidence: "参数区显示 P波时限:-114 ms，时间长度不应为负值。",
              aiJudgement: "AI 基于第二页可见参数判断该字段存在内容级数据错误，需要人工复核原始报告。",
              recommendation: "定位第二页框选参数，回查 PDF 与结构化字段后确认。",
              confidence: 0.92,
              previewPageCount: 2,
              previewImageUrls: [
                "/api/quality/pdf-pages/report-page-1.jpg",
                "/api/quality/pdf-pages/report-page-2.jpg",
              ],
              findingType: "data_error",
              bbox: [82, 77, 6, 4],
            }),
          ],
        }}
      />,
    );

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByText("AI 基于第二页可见参数判断该字段存在内容级数据错误，需要人工复核原始报告。")).toBeInTheDocument();
    expect(within(evidencePanel).getByText("第 2 / 2 页")).toBeInTheDocument();
    expect(within(evidencePanel).getByLabelText("数据错误标注：P波时限负值")).toBeInTheDocument();
    expect(within(evidencePanel).queryByText("需要补充 OCR 证据")).not.toBeInTheDocument();
  });  it("draws page-level evidence boxes for data errors and privacy leaks", async () => {
    const user = userEvent.setup();

    render(
      <QualityShell
        view="detail"
        dataset={{
          ...dataset,
          issues: [
            issue({
              id: "r-vision-data-error",
              index: 1,
              fileName: "report-page.png",
              page: "图片",
              issueType: "心率边界值需要复核",
              category: "content",
              ruleId: "R-VISION-001",
              evidence: "心率显示 59 bpm，接近常用阈值。",
              aiJudgement: "数据错误需复核",
              recommendation: "复核心电图结论。",
              confidence: 0.82,
              bbox: [12, 18, 36, 14],
              findingType: "data_error",
            } as QualityIssueData),
            issue({
              id: "r-vision-privacy-leak",
              index: 2,
              fileName: "report-page.png",
              page: "图片",
              issueType: "疑似未脱敏",
              category: "privacy",
              severity: "high",
              ruleId: "R-PRIVACY-003",
              evidence: "页面顶部出现完整姓名。",
              aiJudgement: "疑似敏感信息未脱敏",
              recommendation: "进入人工复核。",
              confidence: 0.91,
              bbox: [8, 6, 28, 10],
              findingType: "privacy_leak",
            } as QualityIssueData),
          ],
        }}
      />,
    );

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByLabelText("数据错误标注：心率边界值需要复核")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "report-page.png (2)" }));
    const updatedEvidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(updatedEvidencePanel).getByLabelText("未脱敏标注：疑似未脱敏")).toBeInTheDocument();
  });
  it("renders pdf page preview boxes from backend preview image", async () => {
    render(
      <QualityShell
        view="detail"
        dataset={{
          ...dataset,
          issues: [
            issue({
              id: "r-vision-pdf-data-error",
              index: 1,
              fileName: "report.pdf",
              page: "1",
              issueType: "血红蛋白数值需复核",
              category: "content",
              severity: "high",
              ruleId: "R-VISION-001",
              evidence: "PDF 首页血红蛋白结果疑似异常。",
              aiJudgement: "页面证据显示该处存在数据错误风险。",
              recommendation: "查看框选区域并回查结构化数据。",
              confidence: 0.9,
              previewImageUrl: "/api/quality/pdf-pages/rendered-report-page.png",
              bbox: [14, 20, 32, 12],
              findingType: "data_error",
            } as QualityIssueData),
          ],
        }}
      />,
    );

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByAltText("report.pdf 预览")).toBeInTheDocument();
    expect(within(evidencePanel).getByLabelText("数据错误标注：血红蛋白数值需复核")).toBeInTheDocument();
    expect(within(evidencePanel).queryByText("打开 PDF 原文件：report.pdf")).not.toBeInTheDocument();
  });
  it("lets reviewers page through pdf previews and only marks the issue page", async () => {
    const user = userEvent.setup();

    render(
      <QualityShell
        view="detail"
        dataset={{
          ...dataset,
          issues: [
            issue({
              id: "r-vision-pdf-page-2",
              index: 1,
              fileName: "report.pdf",
              page: "2",
              issueType: "第二页血糖数值需复核",
              category: "content",
              severity: "high",
              ruleId: "R-VISION-001",
              evidence: "PDF 第二页血糖结果疑似异常。",
              aiJudgement: "页面证据显示第二页存在数据错误风险。",
              recommendation: "查看第二页框选区域并回查结构化数据。",
              confidence: 0.9,
              previewImageUrl: "/api/quality/pdf-pages/report-page-2.png",
              previewImageUrls: [
                "/api/quality/pdf-pages/report-page-1.png",
                "/api/quality/pdf-pages/report-page-2.png",
                "/api/quality/pdf-pages/report-page-3.png",
              ],
              previewPageCount: 3,
              bbox: [14, 20, 32, 12],
              findingType: "data_error",
            } as QualityIssueData),
          ],
        }}
      />,
    );

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByText("第 2 / 3 页")).toBeInTheDocument();
    expect(within(evidencePanel).getByAltText("report.pdf 第 2 页预览")).toBeInTheDocument();
    expect(within(evidencePanel).getByLabelText("数据错误标注：第二页血糖数值需复核")).toBeInTheDocument();

    await user.click(within(evidencePanel).getByRole("button", { name: "上一页" }));
    expect(within(evidencePanel).getByText("第 1 / 3 页")).toBeInTheDocument();
    expect(within(evidencePanel).queryByLabelText("数据错误标注：第二页血糖数值需复核")).not.toBeInTheDocument();

    await user.click(within(evidencePanel).getByRole("button", { name: "下一页" }));
    expect(within(evidencePanel).getByText("第 2 / 3 页")).toBeInTheDocument();
    expect(within(evidencePanel).getByLabelText("数据错误标注：第二页血糖数值需复核")).toBeInTheDocument();
  });
  it("groups target quality findings and labels preview evidence by issue type", async () => {
    const user = userEvent.setup();

    render(
      <QualityShell
        key="groups-target"
        view="detail"
        dataset={{
          ...dataset,
          issues: [
            issue({
              id: "r-missing-text",
              index: 1,
              fileName: "体检报告.pdf",
              page: "1",
              issueType: "疑似缺字",
              category: "content",
              severity: "high",
              ruleId: "R-VISION-001",
              evidence: "第 2 页检验项名称被裁切。",
              aiJudgement: "疑似缺字需复核",
              recommendation: "核对原图。",
              confidence: 0.88,
              previewImageUrls: ["/api/quality/pdf-pages/page-1.png", "/api/quality/pdf-pages/page-2.png"],
              previewPageCount: 2,
              bbox: [10, 12, 30, 8],
              findingType: "missing_text",
            }),
            issue({
              id: "r-format",
              index: 2,
              fileName: "体检报告.pdf",
              page: "2",
              issueType: "页数边界",
              category: "format",
              severity: "medium",
              ruleId: "R-VISION-001",
              evidence: "报告页数接近边界。",
              aiJudgement: "页数边界需确认",
              recommendation: "核对页数规则。",
              confidence: 0.8,
              previewImageUrls: ["/api/quality/pdf-pages/page-1.png", "/api/quality/pdf-pages/page-2.png"],
              previewPageCount: 2,
              bbox: [20, 20, 25, 10],
              findingType: "format",
            }),
            issue({
              id: "r-privacy",
              index: 3,
              fileName: "体检报告.pdf",
              page: "2",
              issueType: "疑似未脱敏",
              category: "privacy",
              severity: "high",
              ruleId: "R-VISION-001",
              evidence: "第 2 页顶部可见完整身份证号。",
              aiJudgement: "页面存在疑似未脱敏个人身份信息。",
              recommendation: "进入人工复核，不自动修改 PDF。",
              confidence: 0.92,
              previewImageUrls: ["/api/quality/pdf-pages/page-1.png", "/api/quality/pdf-pages/page-2.png"],
              previewPageCount: 2,
              bbox: [8, 6, 38, 7],
              findingType: "privacy_leak",
            }),
            issue({
              id: "r-history",
              index: 4,
              fileName: "体检报告.pdf",
              page: "2",
              issueType: "历史对比缺失",
              category: "history",
              severity: "medium",
              ruleId: "R-VISION-001",
              evidence: "页面写有历史对比，但未展示历史指标或对比表。",
              aiJudgement: "历史对比证据缺失，需要人工确认。",
              recommendation: "回查同一档案号历史报告和结构化数据。",
              confidence: 0.86,
              previewImageUrls: ["/api/quality/pdf-pages/page-1.png", "/api/quality/pdf-pages/page-2.png"],
              previewPageCount: 2,
              bbox: [18, 48, 45, 10],
              findingType: "history_gap",
            }),
          ],
        }}
      />,
    );

    expect(within(screen.getByLabelText("当前问题证据")).getByText("疑似缺字需复核")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "体检报告.pdf (2)" }));
    expect(within(screen.getByLabelText("当前问题证据")).getByText("页数边界需确认")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "体检报告.pdf (3)" }));
    expect(within(screen.getByLabelText("当前问题证据")).getByText("页面存在疑似未脱敏个人身份信息。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "体检报告.pdf (4)" }));
    expect(within(screen.getByLabelText("当前问题证据")).getByText("历史对比证据缺失，需要人工确认。")).toBeInTheDocument();
  });  it("shows imported image evidence after data cleaning", async () => {
    render(
      <QualityShell
        view="detail"
        dataset={{
          ...dataset,
          issues: [
            issue({
              id: "r-image-001-1-report-page",
              index: 1,
              fileName: "report-page.png",
              page: "图片",
              issueType: "图片待 OCR",
              category: "content",
              ruleId: "R-IMAGE-001",
              evidence: "已导入图片文件 report-page.png，等待 OCR 或视觉模型生成文字证据。",
              aiJudgement: "需补充 OCR 证据",
              recommendation: "先展示原始图片供人工复核，后续接入 OCR/视觉模型后再生成内容级判断。",
              confidence: 0.72,
              previewImageUrl: "/api/quality/import/quality-import-image123/files/report-page.png",
              previewType: "image",
            }),
          ],
        }}
      />,
    );

    const evidencePanel = screen.getByLabelText("当前问题证据");
    const preview = within(evidencePanel).getByRole("img", { name: "report-page.png 预览" });
    expect(preview).toHaveAttribute("src", "/api/quality/import/quality-import-image123/files/report-page.png");
    expect(within(evidencePanel).queryByText("XX体检中心检验报告单")).not.toBeInTheDocument();
  });
});























