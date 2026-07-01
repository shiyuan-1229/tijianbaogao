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
  it("renders the live detail shell instead of the legacy conversation shell", async () => {
    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getAllByText("体检报告页面预览").length).toBeGreaterThan(0);
    expect(screen.getByText("单份报告明细")).toBeInTheDocument();
    expect(screen.getByLabelText("当前问题证据")).toBeInTheDocument();
    expect(within(screen.getByLabelText("当前问题证据")).getByRole("button", { name: "确认问题" })).toBeInTheDocument();
    expect(screen.queryByText("持续对话诊断工作区")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("上传文件")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发送" })).not.toBeInTheDocument();
  }, 30000);

  it("shows preview, issue table, and resize controls in the detail workspace", async () => {
    render(await AgentPage());

    expect(screen.queryByLabelText("预览区域高度")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("证据详情宽度")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭证据详情" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "问题描述" })).toBeInTheDocument();
  });

  it("renders the session detail route as the same evidence-backed workspace", async () => {
    const page = await AgentSessionPage({
      params: Promise.resolve({ sessionId: encodeURIComponent("张三_体检报告.pdf") }),
    });

    render(page);

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getAllByText("张三_体检报告.pdf").length).toBeGreaterThan(0);
    expect(screen.getByText("AI 判断")).toBeInTheDocument();
    expect(screen.queryByText("会话列表")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "继续追问" })).not.toBeInTheDocument();
  });

  it("falls back to prototype detail evidence when the dataset scan cannot load", async () => {
    process.env.QUALITY_DATASET_PATH = "D:\\missing-quality-dataset-for-conversation-page-test";

    render(await AgentPage());

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getAllByText("体检报告页面预览").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "确认问题" })).toBeInTheDocument();
    expect(screen.queryByText("Conversation Agent")).not.toBeInTheDocument();
  });
});
