import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import QualityPage from "@/app/(workspace)/quality/page";

describe("quality page", () => {
  it("renders the batch detection workspace with import panel and overview charts", async () => {
    render(await QualityPage());

    expect(screen.getByRole("heading", { name: "批量检测工作台" })).toBeInTheDocument();
    expect(screen.getByText("D:/桌面/数据/5人")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "导入体检报告数据" })).toBeInTheDocument();
    expect(screen.getByLabelText("选择文件夹导入")).toBeInTheDocument();
    expect(screen.getByLabelText("选择待清洗文件")).toBeInTheDocument();

    expect(screen.getByText("体检数据质量分布")).toBeInTheDocument();
    expect(screen.getByText("年龄段覆盖 vs 均衡目标")).toBeInTheDocument();
    expect(screen.getByText("性别比例（目标 1:1）")).toBeInTheDocument();
    expect(screen.getByText("报告页数分布")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();
  });
});
