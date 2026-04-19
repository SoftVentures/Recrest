import type { FullConfig } from "@playwright/test";

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // Intentionally empty. Traces, screenshots, and HTML report are useful after
  // the run — don't wipe them here. CI uploads `.screenshots/playwright/` as
  // an artifact.
}
