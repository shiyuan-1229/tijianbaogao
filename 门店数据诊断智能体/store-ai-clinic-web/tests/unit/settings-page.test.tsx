import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const loadDefaultQualityDatasetMock = vi.hoisted(() => vi.fn());
const loadDefaultQualityExportsMock = vi.hoisted(() => vi.fn());
const exportHistoryFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quality/lib/default-dataset", () => ({
  loadDefaultQualityDataset: loadDefaultQualityDatasetMock,
}));

vi.mock("@/features/quality/lib/default-exports", () => ({
  loadDefaultQualityExports: loadDefaultQualityExportsMock,
}));

import SettingsPage from "@/app/(workspace)/settings/page";

afterEach(() => {
  vi.unstubAllGlobals();
  exportHistoryFetchMock.mockReset();
  loadDefaultQualityDatasetMock.mockReset();
  loadDefaultQualityExportsMock.mockReset();
});

function flushEffects() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("settings page", () => {
  it("renders the report export workspace", async () => {
    loadDefaultQualityDatasetMock.mockResolvedValue({
      datasetPath: "D:/桌面/数据/5人",
      scannedAt: "2026-06-26T12:00:00.000Z",
      metrics: [],
      pipeline: [],
      issues: [],
    });
    loadDefaultQualityExportsMock.mockResolvedValue({
      datasetPath: "D:/桌面/数据/5人",
      generatedAt: "2026-06-30T12:00:00.000Z",
      totalIssues: 3,
      confirmedIssues: 1,
      rejectedIssues: 1,
      pendingIssues: 1,
      reviewRecordCount: 2,
      evidenceImageCount: 4,
      sections: [],
      ruleHits: [],
    });

    render(await SettingsPage());

    expect(screen.getByRole("heading", { level: 1, name: "报告导出" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览交付包" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();

    expect(screen.getByText("交付物选择")).toBeInTheDocument();
    expect(screen.getByText("导出预览")).toBeInTheDocument();
    expect(screen.getByText("导出记录")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成交付包" })).toBeInTheDocument();
  });

  it("loads dataset and export summary before rendering the export workspace", async () => {
    vi.stubGlobal("fetch", exportHistoryFetchMock);
    loadDefaultQualityDatasetMock.mockResolvedValue({
      datasetPath: "D:/桌面/数据/5人",
      scannedAt: "2026-06-26T12:00:00.000Z",
      metrics: [],
      pipeline: [],
      issues: [],
    });
    loadDefaultQualityExportsMock.mockResolvedValue({
      datasetPath: "D:/桌面/数据/5人",
      generatedAt: "2026-06-30T12:00:00.000Z",
      totalIssues: 0,
      confirmedIssues: 0,
      rejectedIssues: 0,
      pendingIssues: 0,
      reviewRecordCount: 0,
      evidenceImageCount: 0,
      sections: [],
      ruleHits: [],
    });

    render(await SettingsPage());
    await flushEffects();

    expect(loadDefaultQualityDatasetMock).toHaveBeenCalled();
    expect(loadDefaultQualityExportsMock).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "报告导出" })).toBeInTheDocument();
  });
});
