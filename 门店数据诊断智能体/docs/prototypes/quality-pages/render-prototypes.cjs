const path = require("path");
const { chromium } = require(path.resolve(__dirname, "../../../store-ai-clinic-web/node_modules/playwright"));

(async () => {
  const outDir = path.resolve(__dirname);
  const html = "file:///" + path.join(outDir, "quality-page-prototypes.html").replace(/\\/g, "/");
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(html, { waitUntil: "load" });
  const shots = [
    ["issues", "01-问题清单.png"],
    ["detail", "02-单报告详情.png"],
    ["review", "03-人工复核.png"],
    ["rules", "04-规则库.png"],
    ["export", "05-报告导出.png"],
  ];
  for (const [id, name] of shots) {
    await page.locator(`#${id}`).screenshot({ path: path.join(outDir, name) });
  }
  await browser.close();
})();

