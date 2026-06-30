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
  it("renders the screenshot-style single report detail workspace", async () => {
    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByText("围绕一份报告核验证据链，证明每个判断都能追溯到文件、页码、字段和规则。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上一份" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一份" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入人工复核" })).toBeInTheDocument();

    const preview = screen.getByLabelText("PDF 页面预览");
    expect(within(preview).getByRole("heading", { name: "PDF 页面预览" })).toBeInTheDocument();
    expect(within(preview).getByText("王五_体检报告.pdf，第 2 / 5 页")).toBeInTheDocument();
    expect(within(preview).getByText("XX体检中心检验报告单")).toBeInTheDocument();
    expect(within(preview).getByText("谷丙转氨酶")).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: "第2页" })).toHaveClass("border-[#0b9a9a]", "bg-[#e6f7f7]");

    const evidence = screen.getByLabelText("证据核查工作区");
    expect(within(evidence).getByRole("heading", { name: "证据核查工作区" })).toBeInTheDocument();
    expect(within(evidence).getByText("OCR 文本片段")).toBeInTheDocument();
    expect(within(evidence).getByText(/OCR 置信度 0.92/)).toBeInTheDocument();
    expect(within(evidence).getByText("结构化 Excel 对照")).toBeInTheDocument();
    expect(within(evidence).getByText(/ArchivesNum=02496166/)).toBeInTheDocument();
    expect(within(evidence).getByText("同报告问题")).toBeInTheDocument();
    expect(within(evidence).getByText("详情页不直接给最终复核结论，只把证据链整理清楚，降低人工复核时的来回跳转。")).toBeInTheDocument();

    const advice = screen.getByLabelText("AI 判断与建议");
    expect(within(advice).getByRole("heading", { name: "AI 判断与建议" })).toBeInTheDocument();
    expect(within(advice).getByText("AI 判断")).toBeInTheDocument();
    expect(within(advice).getByText(/疑似未脱敏个人身份信息/)).toBeInTheDocument();
    expect(within(advice).getByText("证据完整性")).toBeInTheDocument();
    expect(within(advice).getByText("PDF 页图")).toBeInTheDocument();
    expect(within(advice).getByText("OCR 文本")).toBeInTheDocument();
    expect(within(advice).getByText("规则依据")).toBeInTheDocument();
    expect(within(advice).getByText("Excel 对照")).toBeInTheDocument();
    expect(within(advice).getByRole("button", { name: "提交到人工复核" })).toBeInTheDocument();
    expect(screen.queryByText("持续对话诊断工作区")).not.toBeInTheDocument();
  }, 30000);

  it("falls back to static quality detail data when the dataset scan is unavailable", async () => {
    process.env.QUALITY_DATASET_PATH = "D:\\missing-quality-dataset-for-agent-test";

    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByText("王五_体检报告.pdf，第 2 / 5 页")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交到人工复核" })).toBeInTheDocument();
    expect(screen.queryByText("会话列表")).not.toBeInTheDocument();
  });
});