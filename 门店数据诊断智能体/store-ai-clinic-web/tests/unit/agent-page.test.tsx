import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AgentPage from "@/app/(workspace)/agent/page";

const originalDatasetPath = process.env.QUALITY_DATASET_PATH;

afterEach(() => {
  if (originalDatasetPath === undefined) {
    delete process.env.QUALITY_DATASET_PATH;
  } else {
    process.env.QUALITY_DATASET_PATH = originalDatasetPath;
  }
  vi.unstubAllGlobals();
});

describe("agent page", () => {
  it("renders the live single report detail workspace", async () => {
    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByText("单份报告明细")).toBeInTheDocument();
    expect(screen.getAllByText("谷丙转氨酶疑似缺字，需要人工复核页面原图。").length).toBeGreaterThan(0);

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByText("体检报告页面预览")).toBeInTheDocument();
    expect(within(evidencePanel).getByText("AI 判断")).toBeInTheDocument();
    expect(within(evidencePanel).getByText("规则依据")).toBeInTheDocument();
    expect(within(evidencePanel).getByRole("button", { name: "确认问题" })).toBeInTheDocument();
    expect(screen.queryByText("持续对话诊断工作区")).not.toBeInTheDocument();
  }, 30000);

  it("falls back to prototype quality detail data when the dataset scan is unavailable", async () => {
    process.env.QUALITY_DATASET_PATH = "D:\\missing-quality-dataset-for-agent-test";

    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByLabelText("当前问题证据")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认问题" })).toBeInTheDocument();
    expect(screen.getByText("单份报告明细")).toBeInTheDocument();
    expect(screen.queryByText("会话列表")).not.toBeInTheDocument();
  });
});
