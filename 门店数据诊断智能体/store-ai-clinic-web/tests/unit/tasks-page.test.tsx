import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TasksPage from "@/app/(workspace)/tasks/page";
import TaskDetailPage from "@/app/(workspace)/tasks/[taskId]/page";

describe("tasks page", () => {
  it("renders the screenshot-style issue list and triage summary", async () => {
    render(await TasksPage());

    expect(screen.getByRole("heading", { name: "问题清单" })).toBeInTheDocument();
    expect(screen.getByText("全局分诊，按风险类型、规则和状态定位问题，不在这里做人工作结论。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量标记" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入详情" })).toBeInTheDocument();

    const stats = screen.getByLabelText("问题统计");
    expect(within(stats).getByText("疑似缺字")).toBeInTheDocument();
    expect(within(stats).getByText("12")).toBeInTheDocument();
    expect(within(stats).getByText("页数边界")).toBeInTheDocument();
    expect(within(stats).getAllByText("8")).toHaveLength(2);
    expect(within(stats).getByText("疑似未脱敏")).toBeInTheDocument();
    expect(within(stats).getByText("9")).toBeInTheDocument();
    expect(within(stats).getByText("历史对比")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "问题类型：全部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "严重程度：全部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "年龄段：全部" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "处理状态：全部" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入文件名、规则或证据关键词")).toBeInTheDocument();

    expect(screen.getByText("问题列表")).toBeInTheDocument();
    expect(screen.getByText("用于批量分诊和跳转详情")).toBeInTheDocument();
    expect(screen.getByText("37 条")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "类型" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "证据摘要" })).toBeInTheDocument();
    expect(screen.getAllByText("王五_体检报告.pdf")).toHaveLength(2);
    expect(screen.getByText("顶部身份证号完整可见")).toBeInTheDocument();

    const summary = screen.getByLabelText("分诊证据摘要");
    expect(within(summary).getByText("分诊证据摘要")).toBeInTheDocument();
    expect(within(summary).getByText("当前选中")).toBeInTheDocument();
    expect(within(summary).getByText("未脱敏")).toBeInTheDocument();
    expect(within(summary).getByText("命中规则")).toBeInTheDocument();
    expect(within(summary).getByText(/R-PRIVACY-003/)).toBeInTheDocument();
    expect(within(summary).getByText("下一步")).toBeInTheDocument();
    expect(within(summary).getByRole("button", { name: "查看单报告详情" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "确认问题" })).not.toBeInTheDocument();
  });

  it("renders a dedicated report detail experience without showing the task id as the title", async () => {
    const detailPage = await TaskDetailPage({
      params: Promise.resolve({ taskId: "task-route-999" }),
    });

    render(detailPage);

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getByText("PDF 页面预览")).toBeInTheDocument();
    expect(screen.getByText("AI 判断与建议")).toBeInTheDocument();
    expect(screen.queryByText(/task-route-999/)).not.toBeInTheDocument();
  });

  it("clears issue rows when search results become empty", async () => {
    const user = userEvent.setup();

    render(await TasksPage());

    await user.type(screen.getByPlaceholderText("请输入文件名、规则或证据关键词"), "no-matching-issue");

    expect(screen.getByText("当前筛选条件下暂无质检问题。")).toBeInTheDocument();
    expect(screen.queryByText("王五_体检报告.pdf")).not.toBeInTheDocument();
  });
});