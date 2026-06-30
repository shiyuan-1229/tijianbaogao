import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import BrandsPage from "@/app/(workspace)/brands/page";

describe("brands page", () => {
  it("renders the human review queue for quality issues", async () => {
    render(await BrandsPage());

    expect(screen.getByRole("heading", { name: "人工复核" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "只看高风险" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存复核记录" })).toBeInTheDocument();
    expect(screen.getByText("复核队列")).toBeInTheDocument();
    expect(screen.getByText("当前问题证据")).toBeInTheDocument();
    expect(screen.getByText("复核决策")).toBeInTheDocument();
    expect(screen.getByText("复核决策队列")).toBeInTheDocument();
    expect(screen.getByText("待我复核")).toBeInTheDocument();
    expect(screen.getByText("争议问题")).toBeInTheDocument();
    expect(screen.getByText("已驳回")).toBeInTheDocument();
    expect(screen.getByText("王五_体检报告.pdf")).toBeInTheDocument();
    expect(screen.getByText("XX体检中心检验报告单")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认问题" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "驳回判断" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "标记争议" })).toBeInTheDocument();
    expect(screen.getByLabelText("当前问题证据")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "品牌档案" })).not.toBeInTheDocument();
  });
});

