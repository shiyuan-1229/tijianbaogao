import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const loadDefaultQualityDatasetMock = vi.hoisted(() => vi.fn());
const loadDefaultQualityExportsMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quality/lib/default-dataset", () => ({
  loadDefaultQualityDataset: loadDefaultQualityDatasetMock,
}));

vi.mock("@/features/quality/lib/default-exports", () => ({
  loadDefaultQualityExports: loadDefaultQualityExportsMock,
}));

import SettingsPage from "@/app/(workspace)/settings/page";

describe("settings page", () => {
  it("renders the screenshot-style report export workspace", async () => {
    render(await SettingsPage());

    expect(screen.getByRole("heading", { level: 1, name: "报告导出" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览交付包" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();

    expect(screen.getByText("交付物选择")).toBeInTheDocument();
    expect(screen.getByText("导出预览")).toBeInTheDocument();
    expect(screen.getByText("导出记录")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /第三批数据检测报告/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /不合规问题清单/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /可能合规清单/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /人工复核记录/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /证据截图索引/ })).toBeInTheDocument();

    expect(screen.getByText("总问题")).toBeInTheDocument();
    expect(screen.getByText("已确认")).toBeInTheDocument();
    expect(screen.getByText("待复核")).toBeInTheDocument();
    expect(screen.getByText("争议")).toBeInTheDocument();
    expect(screen.getByText("风险摘要")).toBeInTheDocument();
    expect(screen.getByText("问题明细")).toBeInTheDocument();
    expect(screen.getByText("复核记录")).toBeInTheDocument();
    expect(screen.getByText("规则统计")).toBeInTheDocument();
    expect(screen.getByText("证据索引")).toBeInTheDocument();

    expect(screen.getAllByText("完成").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("复核版")).toBeInTheDocument();
    expect(screen.getByText("草稿")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成交付包" })).toBeInTheDocument();
    expect(screen.queryByText("模型与 AI")).not.toBeInTheDocument();
  });

  it("does not block initial report export render on dataset or export summary loading", async () => {
    render(await SettingsPage());

    expect(loadDefaultQualityDatasetMock).not.toHaveBeenCalled();
    expect(loadDefaultQualityExportsMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "报告导出" })).toBeInTheDocument();
  });
});