import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import KnowledgePage from "@/app/(workspace)/knowledge/page";

describe("knowledge page", () => {
  it("renders the 17 third-level inspection rules", async () => {
    render(await KnowledgePage());

    expect(screen.getByRole("heading", { level: 1, name: "规则库" })).toBeInTheDocument();
    expect(screen.getByText("全部规则可视化总览")).toBeInTheDocument();
    expect(screen.getAllByText("共 17 条规则").length).toBeGreaterThan(0);
    expect(screen.getAllByText("硬性 H1-H8").length).toBeGreaterThan(0);
    expect(screen.getAllByText("质量 Q1-Q5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("参考 R1-R4").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /查看规则 H1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /查看规则 Q1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /查看规则 R4/ })).toBeInTheDocument();
    expect(screen.getAllByText("内科检查缺失").length).toBeGreaterThan(0);
    expect(screen.getAllByText("隐私信息未脱敏").length).toBeGreaterThan(0);
    expect(screen.getAllByText("历史对比数据可用性").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "规则 H1 已启用" })).toBeInTheDocument();
    expect(screen.getAllByText("关闭风险：高").length).toBeGreaterThan(0);

    const overview = screen.getByLabelText("全部规则可视化总览");
    expect(overview).toBeInTheDocument();
    expect(overview).toHaveClass("max-h-[620px]", "overflow-y-auto");
    expect(within(overview).getAllByText(/关闭风险：/).length).toBeGreaterThanOrEqual(17);
    expect(screen.queryByText("R-FILE-001")).not.toBeInTheDocument();
    expect(screen.queryByText("R-PRIVACY-003")).not.toBeInTheDocument();
  });

  it("lets reviewers manually add a rule after judging a new problem pattern", async () => {
    const user = userEvent.setup();
    render(await KnowledgePage());

    await user.click(screen.getByRole("button", { name: "添加规则" }));

    await user.clear(screen.getByLabelText("规则 ID"));
    await user.type(screen.getByLabelText("规则 ID"), "M1");
    await user.type(screen.getByLabelText("规则名称"), "报告二维码遮挡");
    await user.type(screen.getByLabelText("失败条件"), "二维码遮挡导致报告来源无法核验。");
    await user.type(screen.getByLabelText("检测方法"), "人工复核页面截图并标记遮挡区域。");
    await user.selectOptions(screen.getByLabelText("规则是否启用"), "disabled");
    await user.selectOptions(screen.getByLabelText("关闭风险程度"), "high");
    await user.click(screen.getByRole("button", { name: "确认添加规则" }));

    expect(screen.getByText("已添加规则 M1，待人工确认后纳入检测标准。")).toBeInTheDocument();
    expect(screen.getByText("共 18 条规则")).toBeInTheDocument();

    const ruleButton = screen.getByRole("button", { name: /查看规则 M1/ });
    expect(ruleButton).toBeInTheDocument();
    await user.click(ruleButton);

    const detail = screen.getByLabelText("规则详情");
    expect(within(detail).getByText("报告二维码遮挡")).toBeInTheDocument();
    expect(within(detail).getByText("二维码遮挡导致报告来源无法核验。")).toBeInTheDocument();
    expect(within(detail).getByText("已关闭")).toBeInTheDocument();
    expect(within(detail).getByText("关闭风险：高")).toBeInTheDocument();
  });
});