import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import AgentPage from "@/app/(workspace)/agent/page";
import QualityPage from "@/app/(workspace)/quality/page";
import TasksPage from "@/app/(workspace)/tasks/page";

describe("inspection workspace redesign", () => {
  it("renders batch inspection with the screenshot-style toolbar", async () => {
    render(await QualityPage());

    expect(screen.getByText("批量检测工作台")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "暂停任务" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新运行" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();
    expect(screen.queryByText("体检报告页面预览")).not.toBeInTheDocument();
    expect(screen.queryByText("高优先级问题")).not.toBeInTheDocument();
  });

  it("renders the issue list as part of the same inspection product", async () => {
    render(await TasksPage());

    expect(screen.getByText("问题清单")).toBeInTheDocument();
    expect(screen.getByText("用于批量分诊和跳转详情")).toBeInTheDocument();
    expect(screen.getByLabelText("当前问题证据")).toBeInTheDocument();
  });

  it("renders the report detail route without the legacy conversation UI", async () => {
    const page = await AgentPage();

    render(page);

    expect(screen.getByText("单报告详情")).toBeInTheDocument();
    expect(screen.getByText("AI 判断")).toBeInTheDocument();
    expect(screen.queryByText("持续对话诊断工作区")).not.toBeInTheDocument();
  });
});
