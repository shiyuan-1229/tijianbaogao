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
});

function flushEffects() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("settings page", () => {
  it("renders the screenshot-style report export workspace", async () => {
    render(await SettingsPage());

    expect(screen.getByRole("heading", { level: 1, name: "报告导出" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览交付包" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();

    expect(screen.getByText("交付物选择")).toBeInTheDocument();
    expect(screen.getByText("导出预览")).toBeInTheDocument();
    expect(screen.getByText("导出记录")).toBeInTheDocument();

    expect(screen.getByRole("checkbox", { name: /第三批数据检测报告/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /不合规问题清单/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /可能合规清单/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /人工复核记录/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /证据截图索引/ })).toBeInTheDocument();

    expect(screen.getByText("总问题")).toBeInTheDocument();
    expect(screen.getByText("已确认")).toBeInTheDocument();
    expect(screen.getByText("待复核")).toBeInTheDocument();
    expect(screen.getByText("争议")).toBeInTheDocument();
    expect(screen.getByText("检测总报告")).toBeInTheDocument();
    expect(screen.getAllByText("不合规清单").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("可能合规").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("复核记录").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("证据索引").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("暂无导出记录。生成第一个交付包后会显示在这里。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成交付包" })).toBeInTheDocument();
    expect(screen.queryByText("模型与 AI")).not.toBeInTheDocument();
  });

  it("does not block initial report export render on dataset, export summary, or export history loading", async () => {
    vi.stubGlobal("fetch", exportHistoryFetchMock);

    render(await SettingsPage());
    await flushEffects();

    expect(loadDefaultQualityDatasetMock).not.toHaveBeenCalled();
    expect(loadDefaultQualityExportsMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "报告导出" })).toBeInTheDocument();
  });
});