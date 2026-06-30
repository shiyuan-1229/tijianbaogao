import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import WorkspaceLayout from "@/app/(workspace)/layout";
import WorkspaceLoading from "@/app/(workspace)/loading";

const pushMock = vi.fn();
const prefetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/agent",
  useRouter: () => ({
    push: pushMock,
    prefetch: prefetchMock,
  }),
}));

describe("workspace shell", () => {
  it("renders a route loading state for slower workspace switches", () => {
    render(<WorkspaceLoading />);

    expect(screen.getByRole("status", { name: "正在打开页面" })).toBeInTheDocument();
    expect(screen.getByText("正在打开页面")).toBeInTheDocument();
  });
  it("renders quality navigation, highlights the active report detail page, and shows dataset shortcuts", () => {
    render(
      <WorkspaceLayout>
        <div>child</div>
      </WorkspaceLayout>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Primary" });
    expect(desktopNav).toBeInTheDocument();
    expect(screen.getAllByText("体检报告质检").length).toBeGreaterThan(0);
    expect(screen.getAllByText("数据合规筛查工作台").length).toBeGreaterThan(0);
    expect(within(desktopNav).getByRole("link", { name: "单报告详情" })).toHaveAttribute("aria-current", "page");
    expect(within(desktopNav).getByRole("link", { name: "批量检测" })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: "问题清单" })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: "人工复核" })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: "规则库" })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: "报告导出" })).toBeInTheDocument();
    expect(screen.getByText("最近数据集")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "第三批体检报告" })).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("gives desktop navigation immediate pending feedback while route content loads", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceLayout>
        <div>child</div>
      </WorkspaceLayout>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Primary" });
    const exportLink = within(desktopNav).getByRole("link", { name: "报告导出" });

    await user.click(exportLink);

    expect(pushMock).toHaveBeenCalledWith("/settings");
    expect(exportLink).toHaveAttribute("aria-busy", "true");
    expect(exportLink).toHaveAttribute("data-pending", "true");
    expect(within(desktopNav).getByText("打开中")).toBeInTheDocument();
  });

  it("prefetches destination routes when users aim at a navigation item", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceLayout>
        <div>child</div>
      </WorkspaceLayout>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Primary" });
    await user.hover(within(desktopNav).getByRole("link", { name: "规则库" }));

    expect(prefetchMock).toHaveBeenCalledWith("/knowledge");
  });
  it("renders a compact navigation bar when the sidebar is hidden on narrow viewports", () => {
    render(
      <WorkspaceLayout>
        <div>child</div>
      </WorkspaceLayout>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Compact primary" });
    expect(within(mobileNav).getByRole("link", { name: "批量检测页面" })).toHaveAttribute("href", "/quality");
    expect(within(mobileNav).getByRole("link", { name: "问题清单页面" })).toHaveAttribute("href", "/tasks");
    expect(within(mobileNav).getByRole("link", { name: "单报告详情页面" })).toHaveAttribute("aria-current", "page");
    expect(within(mobileNav).getByRole("link", { name: "报告导出页面" })).toHaveAttribute("href", "/settings");
  });
});

