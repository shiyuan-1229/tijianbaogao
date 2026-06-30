import { expect as playwrightExpect, test as playwrightTest } from "@playwright/test";

type VitestDescribe = {
  skip: (name: string, fn: () => void) => void;
};

const vitestDescribe = (globalThis as { describe?: VitestDescribe }).describe;

if (!process.env.VITEST) {
  playwrightTest("agent page shows the main diagnosis workflow entry", async ({
    page,
  }) => {
    await page.goto("/agent");

    await playwrightExpect(
      page.getByRole("heading", { name: "与 AI 分析助手协作" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByPlaceholder("输入分析问题、上传报表，或直接发起诊断"),
    ).toBeVisible();
    await playwrightExpect(
      page.getByRole("button", { name: "发起诊断" }),
    ).toBeVisible();
  });
} else {
  vitestDescribe?.skip("playwright-only smoke file", () => {});
}
