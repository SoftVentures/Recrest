import type { FullConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
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
  const webPort = readEnvPort("DEV_PORT_WEB", "3000");
  const tauriPort = readEnvPort("DEV_PORT_TAURI", "1420");
  const appUrl = process.env.RECREST_APP_URL ?? `http://localhost:${webPort}`;
  const landingUrl = process.env.RECREST_LANDING_URL ?? "http://localhost:4321";
  console.log(`[recrest-tests] app=${appUrl} landing=${landingUrl} tauri=${tauriPort}`);
}

function readEnvPort(key: string, fallback: string): string {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  try {
    const raw = readFileSync(resolve(process.cwd(), "..", ".env"), "utf8");
    // Quote-tolerant on both single and double quotes — matches
    // `playwright.config.ts::loadRootEnv` so the two readers stay in sync.
    const m = new RegExp(`^\\s*${key}\\s*=\\s*['"]?(\\d+)['"]?\\s*$`, "m").exec(raw);
    if (m) return m[1]!;
  } catch {
    // fall through
  }
  return fallback;
}
