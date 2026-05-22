import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

// Parse repo-root .env so DEV_PORT_WEB controls the same URL the app's
// Vite dev server binds to. No new dep — the file is tiny and already on disk.
function loadRootEnv(): Record<string, string> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const raw = readFileSync(resolve(root, ".env"), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      if (line.trimStart().startsWith("#")) continue;
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m) continue;
      const key = m[1]!;
      let value = m[2] ?? "";
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

const rootEnv = loadRootEnv();
const APP_PORT = process.env.DEV_PORT_WEB ?? rootEnv.DEV_PORT_WEB ?? "3000";
const APP_URL = process.env.RECREST_APP_URL ?? `http://localhost:${APP_PORT}`;
const LANDING_URL = process.env.RECREST_LANDING_URL ?? "http://localhost:4321";

export default defineConfig({
  testDir: "./src/e2e",
  timeout: 45_000,
  expect: { timeout: 7_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["github"]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "../.screenshots/playwright",
  globalSetup: "./src/setup/global.setup.ts",
  globalTeardown: "./src/setup/global.teardown.ts",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Headed by default locally so the dev can watch tests run; CI stays
    // headless because GitHub runners have no display.
    headless: !!process.env.CI,
  },
  projects: [
    {
      name: "infra",
      testMatch: /e2e[\\/]infra[\\/].*\.spec\.ts$/,
      use: { baseURL: APP_URL },
    },
    {
      name: "landing-desktop",
      testMatch: /e2e[\\/]landing[\\/].*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: LANDING_URL,
      },
    },
    {
      name: "landing-firefox",
      testMatch: /e2e[\\/]landing[\\/](?!10-responsive|11-a11y).*\.spec\.ts$/,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 },
        baseURL: LANDING_URL,
      },
    },
    {
      name: "landing-webkit",
      testMatch: /e2e[\\/]landing[\\/](?!10-responsive|11-a11y).*\.spec\.ts$/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
        baseURL: LANDING_URL,
      },
    },
    {
      name: "landing-mobile",
      testMatch: /e2e[\\/]landing[\\/].*\.spec\.ts$/,
      use: {
        ...devices["iPhone 14"],
        baseURL: LANDING_URL,
      },
    },
    {
      name: "app-desktop",
      testMatch: /e2e[\\/]app[\\/].*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: APP_URL,
      },
    },
    {
      name: "app-firefox",
      testMatch: /e2e[\\/]app[\\/](?!13-a11y).*\.spec\.ts$/,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 },
        baseURL: APP_URL,
      },
    },
    {
      name: "app-webkit",
      testMatch: /e2e[\\/]app[\\/](?!13-a11y).*\.spec\.ts$/,
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
        baseURL: APP_URL,
      },
    },
    {
      name: "app-mobile",
      testMatch: /e2e[\\/]app[\\/].*\.spec\.ts$/,
      use: {
        ...devices["Pixel 7"],
        baseURL: APP_URL,
      },
    },
  ],
  webServer: [
    {
      command: "yarn dev:web",
      cwd: "..",
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "yarn dev:landingpage",
      cwd: "..",
      url: LANDING_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
