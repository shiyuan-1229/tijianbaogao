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

    // 可视化总览
    expect(screen.getByText("合规情况占比")).toBeInTheDocument();
    expect(screen.getByText("男女比例")).toBeInTheDocument();
    expect(screen.getByText("年龄段分布")).toBeInTheDocument();

    // 历史检测记录（测试环境无后端，显示空状态提示）
    expect(screen.getByText(/历史检测记录|暂无历史检测记录/)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();
  });
});
