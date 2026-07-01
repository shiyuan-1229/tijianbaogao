import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import QualityPage from "@/app/(workspace)/quality/page";

describe("quality page", () => {
  it("renders the batch detection workspace with import panel and overview charts", async () => {
    render(await QualityPage());

    expect(screen.getByRole("heading", { name: "批量检测工作台" })).toBeInTheDocument();
    expect(screen.getByText("D:/桌面/数据/5人")).toBeInTheDocument();

    // 导入区在页面最上方
    expect(screen.getByRole("heading", { name: "导入体检报告数据" })).toBeInTheDocument();
    expect(screen.getByLabelText("选择文件夹导入")).toBeInTheDocument();
    expect(screen.getByLabelText("选择待清洗文件")).toBeInTheDocument();

    // 可视化总览拆成懒加载模块，批量页首屏先显示轻量占位。
    expect(screen.getByText("可视化总览加载中...")).toBeInTheDocument();


    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();
  });
});
