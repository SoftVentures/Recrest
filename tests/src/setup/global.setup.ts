import type { FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * One-time setup before the suite. Keeps the screenshots + report directories
 * ready so Playwright doesn't race its own first write, and surfaces the
 * server URLs so a developer can sanity-check the webServer config in logs.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const screenshotDir = resolve(process.cwd(), "..", ".screenshots", "playwright");
  const reportDir = resolve(process.cwd(), "playwright-report");
  await mkdir(screenshotDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const appUrl = process.env.RECREST_APP_URL ?? "http://localhost:3000";
  const landingUrl = process.env.RECREST_LANDING_URL ?? "http://localhost:4321";
  console.log(`[recrest-tests] app=${appUrl} landing=${landingUrl}`);
}
