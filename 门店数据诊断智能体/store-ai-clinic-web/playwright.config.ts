import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "@playwright/test";

type PlaywrightBrowsersManifest = {
  browsers?: Array<{
    name?: string;
    revision?: string;
  }>;
};

function resolveBrowserRevision(browserName: string): string | null {
  const manifestPath = path.join(
    process.cwd(),
    "node_modules",
    "playwright-core",
    "browsers.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as PlaywrightBrowsersManifest;

  return (
    manifest.browsers?.find((browser) => browser.name === browserName)?.revision ??
    null
  );
}

function resolveManagedHeadlessShellPath() {
  const revision = resolveBrowserRevision("chromium-headless-shell");

  if (!revision) {
    return null;
  }

  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    return path.join(
      process.env.LOCALAPPDATA,
      "ms-playwright",
      `chromium_headless_shell-${revision}`,
      "chrome-headless-shell-win64",
      "chrome-headless-shell.exe",
    );
  }

  if (process.platform === "darwin" && process.env.HOME) {
    return path.join(
      process.env.HOME,
      "Library",
      "Caches",
      "ms-playwright",
      `chromium_headless_shell-${revision}`,
      "chrome-headless-shell-mac",
      "chrome-headless-shell",
    );
  }

  if (process.env.HOME) {
    return path.join(
      process.env.HOME,
      ".cache",
      "ms-playwright",
      `chromium_headless_shell-${revision}`,
      "chrome-headless-shell-linux",
      "chrome-headless-shell",
    );
  }

  return null;
}

function resolvePlaywrightUseConfig() {
  const managedHeadlessShell = resolveManagedHeadlessShellPath();

  if (managedHeadlessShell && fs.existsSync(managedHeadlessShell)) {
    return {
      baseURL: "http://127.0.0.1:3000",
    };
  }

  return {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome" as const,
  };
}

export default defineConfig({
  testDir: "./tests/e2e",
  use: resolvePlaywrightUseConfig(),
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  },
});
