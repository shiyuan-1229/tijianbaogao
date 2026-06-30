import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AgentPage from "@/app/(workspace)/agent/page";
import AgentSessionPage from "@/app/(workspace)/agent/[sessionId]/page";

const originalDatasetPath = process.env.QUALITY_DATASET_PATH;

afterEach(() => {
  if (originalDatasetPath === undefined) {
    delete process.env.QUALITY_DATASET_PATH;
  } else {
    process.env.QUALITY_DATASET_PATH = originalDatasetPath;
  }
  vi.unstubAllGlobals();
});

describe("Agent quality detail flow", () => {
  it("renders the screenshot detail shell instead of the legacy conversation shell", async () => {
    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByLabelText("PDF 页面预览")).toBeInTheDocument();
    expect(screen.getByLabelText("证据核查工作区")).toBeInTheDocument();
    expect(screen.getByLabelText("AI 判断与建议")).toBeInTheDocument();
    expect(within(screen.getByLabelText("AI 判断与建议")).getByRole("button", { name: "提交到人工复核" })).toBeInTheDocument();
    expect(screen.queryByText("持续对话诊断工作区")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("上传文件")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发送" })).not.toBeInTheDocument();
  }, 30000);

  it("shows OCR, Excel, rule, and co-issue evidence in the screenshot workspace", async () => {
    render(await AgentPage());

    const evidence = screen.getByLabelText("证据核查工作区");
    expect(within(evidence).getByText("OCR 文本片段")).toBeInTheDocument();
    expect(within(evidence).getByText("结构化 Excel 对照")).toBeInTheDocument();
    expect(within(evidence).getByText("命中规则")).toBeInTheDocument();
    expect(within(evidence).getByText("同报告问题")).toBeInTheDocument();
  });

  it("renders the session detail route as the same screenshot evidence-backed workspace", async () => {
    const page = await AgentSessionPage({
      params: Promise.resolve({ sessionId: "legacy-session-id" }),
    });

    render(page);

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByText("PDF 页面预览")).toBeInTheDocument();
    expect(screen.getByText("AI 判断与建议")).toBeInTheDocument();
    expect(screen.queryByText("会话列表")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "继续追问" })).not.toBeInTheDocument();
  });

  it("falls back to static detail evidence when the dataset scan cannot load", async () => {
    process.env.QUALITY_DATASET_PATH = "D:\\missing-quality-dataset-for-conversation-page-test";

    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByText("王五_体检报告.pdf，第 2 / 5 页")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交到人工复核" })).toBeInTheDocument();
    expect(screen.queryByText("Conversation Agent")).not.toBeInTheDocument();
  });
});