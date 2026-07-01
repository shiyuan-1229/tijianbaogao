import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TasksPage from "@/app/(workspace)/tasks/page";
import TaskDetailPage from "@/app/(workspace)/tasks/[taskId]/page";

describe("tasks page", () => {
  it("renders the live issue list and triage summary", async () => {
    render(await TasksPage());

    expect(screen.getByRole("heading", { name: "问题清单" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停任务" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新运行" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "问题类型：全部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "严重程度：全部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "处理状态：全部" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入关键词")).toBeInTheDocument();

    expect(screen.getByText("问题列表")).toBeInTheDocument();
    expect(screen.getByText("用于批量分诊和跳转详情")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "问题类型" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "问题描述" })).toBeInTheDocument();
    expect(screen.getByText("张三_体检报告.pdf")).toBeInTheDocument();

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByText("证据详情")).toBeInTheDocument();
    expect(within(evidencePanel).getByText("体检报告页面预览")).toBeInTheDocument();
    expect(within(evidencePanel).getByText("AI 判断")).toBeInTheDocument();
    expect(within(evidencePanel).getByText("规则依据")).toBeInTheDocument();
    expect(within(evidencePanel).getByRole("button", { name: "确认问题" })).toBeInTheDocument();
  });

  it("renders a dedicated report detail experience without showing the task id as the title", async () => {
    const detailPage = await TaskDetailPage({
      params: Promise.resolve({ taskId: "task-route-999" }),
    });

    render(detailPage);

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getAllByText("体检报告页面预览").length).toBeGreaterThan(0);
    expect(screen.getByText("AI 判断")).toBeInTheDocument();
    expect(screen.queryByText(/task-route-999/)).not.toBeInTheDocument();
  });

  it("clears issue rows when search results become empty", async () => {
    const user = userEvent.setup();

    render(await TasksPage());

    await user.type(screen.getByPlaceholderText("请输入关键词"), "no-matching-issue");

    expect(screen.getByText("当前筛选条件下暂无质检问题。")).toBeInTheDocument();
    expect(screen.queryByText("张三_体检报告.pdf")).not.toBeInTheDocument();
  });
});
