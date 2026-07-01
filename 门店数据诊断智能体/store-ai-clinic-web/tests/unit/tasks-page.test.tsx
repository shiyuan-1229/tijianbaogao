import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import TasksPage from "@/app/(workspace)/tasks/page";
import TaskDetailPage from "@/app/(workspace)/tasks/[taskId]/page";

describe("tasks page", () => {
  it("renders file-level quality summaries with detail links", async () => {
    render(await TasksPage());

    expect(screen.getByRole("heading", { name: "问题清单" })).toBeInTheDocument();
    expect(screen.getByText("这里先看每个文件的大概情况，具体问题和证据统一进入单报告详情查看。")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "文件名" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "年龄组" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "页数" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "状态" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "操作建议" })).toBeInTheDocument();
    expect(screen.getByText("张三_体检报告.pdf")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "详情" }).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("当前问题证据")).not.toBeInTheDocument();
  });

  it("renders a dedicated report detail experience without showing the raw route param as the title", async () => {
    const detailPage = await TaskDetailPage({
      params: Promise.resolve({ taskId: encodeURIComponent("张三_体检报告.pdf") }),
    });

    render(detailPage);

    expect(screen.getByRole("heading", { name: "单报告详情" })).toBeInTheDocument();
    expect(screen.getAllByText("体检报告页面预览").length).toBeGreaterThan(0);
    expect(screen.getByText("AI 判断")).toBeInTheDocument();
    expect(screen.getAllByText("张三_体检报告.pdf").length).toBeGreaterThan(0);
  });
});
