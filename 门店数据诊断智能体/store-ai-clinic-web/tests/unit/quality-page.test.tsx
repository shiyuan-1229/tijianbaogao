import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import QualityPage from "@/app/(workspace)/quality/page";

describe("quality page", () => {
  it("renders the medical report quality workspace from the real dataset scan", async () => {
    render(await QualityPage());

    expect(screen.getByRole("heading", { name: "批量检测工作台" })).toBeInTheDocument();
    expect(screen.getByText("D:/桌面/数据/5人")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getAllByText("Excel").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("PDF 指标图标")).toBeInTheDocument();
    expect(screen.getByLabelText("Excel 指标图标")).toBeInTheDocument();
    expect(screen.getByLabelText("问题 指标图标")).toBeInTheDocument();
    expect(screen.getByLabelText("待复核 指标图标")).toBeInTheDocument();
    expect(screen.getByText("高优先级问题")).toBeInTheDocument();
    expect(screen.getByText("证据详情")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出结果" })).toBeInTheDocument();
  });

  it("filters issue rows and updates the evidence panel when a real scan issue is selected", async () => {
    const user = userEvent.setup();

    render(await QualityPage());

    await user.click(screen.getByRole("button", { name: "问题类型：全部" }));
    await user.click(screen.getByRole("menuitem", { name: "疑似缺字" }));

    expect(screen.getByText("02250201.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /02250201\.pdf/ }));

    const evidencePanel = screen.getByLabelText("当前问题证据");
    expect(within(evidencePanel).getByText(/R-OCR-001/)).toBeInTheDocument();
    expect(within(evidencePanel).getAllByText(/未发现可用 OCR 工具/)[0]).toBeInTheDocument();
  });
});