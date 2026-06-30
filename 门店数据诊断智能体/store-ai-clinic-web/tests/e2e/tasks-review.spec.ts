import { expect as playwrightExpect, test as playwrightTest } from "@playwright/test";

type VitestDescribe = {
  skip: (name: string, fn: () => void) => void;
};

const vitestDescribe = (globalThis as { describe?: VitestDescribe }).describe;

if (!process.env.VITEST) {
  playwrightTest("tasks overview and detail render the review shell and result context", async ({
    page,
  }) => {
    await page.goto("/tasks");

    await playwrightExpect(
      page.getByRole("heading", { name: "任务复核" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByRole("heading", { name: "执行日志" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByRole("heading", { name: "诊断结果" }),
    ).toBeVisible();

    const detailLink = page.getByRole("link", { name: "查看详情" }).first();
    await playwrightExpect(detailLink).toHaveAttribute("href", /\/tasks\/.+$/);
    const detailHref = await detailLink.getAttribute("href");

    await page.goto(detailHref ?? "/tasks/task-daily-001");

    await playwrightExpect(page).toHaveURL(/\/tasks\/.+$/);
    await playwrightExpect(
      page.getByRole("heading", { name: "执行日志" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByRole("heading", { name: "诊断结果" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText("下一步动作", { exact: true }),
    ).toBeVisible();
  });
} else {
  vitestDescribe?.skip("playwright-only smoke file", () => {});
}
