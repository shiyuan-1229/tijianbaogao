import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import KnowledgePage from "@/app/(workspace)/knowledge/page";

describe("knowledge page", () => {
  it("renders the quality rule library view", async () => {
    render(await KnowledgePage());

    expect(screen.getByRole("heading", { level: 1, name: "规则库" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导入需求文档" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增规则" })).toBeInTheDocument();
    expect(screen.getByText("规则分类")).toBeInTheDocument();
    expect(screen.getByText("脱敏风险")).toBeInTheDocument();
    expect(screen.getByText("页数与格式")).toBeInTheDocument();
    expect(screen.getByText("内容完整性")).toBeInTheDocument();
    expect(screen.getByText("历史对比")).toBeInTheDocument();
    expect(screen.getByText("规则列表")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索规则 ID 或失败条件")).toBeInTheDocument();
    expect(screen.getByText("R-FILE-001")).toBeInTheDocument();
    expect(screen.getByText("PDF + 结构化数据")).toBeInTheDocument();
    expect(screen.getByText("R-PRIVACY-003")).toBeInTheDocument();
    expect(screen.getByText("规则详情")).toBeInTheDocument();
    expect(screen.getByText("失败条件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存规则说明" })).toBeInTheDocument();
    expect(screen.queryByText("上传新资料")).not.toBeInTheDocument();
  });

  it("supports compact rule library interactions", async () => {
    const user = userEvent.setup();
    render(await KnowledgePage());

    await user.click(screen.getByRole("button", { name: /历史对比/ }));
    expect(screen.getByRole("button", { name: "查看规则 R-HISTORY-004" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /R-PRIVACY-003/ })).not.toBeInTheDocument();

    const search = screen.getByLabelText("搜索规则");
    await user.clear(search);
    await user.type(search, "OCR");
    expect(screen.getByRole("button", { name: "查看规则 R-OCR-001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "查看规则 R-HISTORY-004" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "查看规则 R-OCR-001" }));
    expect(screen.getByText("当前选中：R-OCR-001")).toBeInTheDocument();
    expect(screen.getByText("OCR 证据完整性")).toBeInTheDocument();

    const ocrStatusButton = screen.getByRole("button", { name: "切换 R-OCR-001 状态" });
    await user.click(ocrStatusButton);
    expect(ocrStatusButton).toHaveTextContent("启用");
  });
});