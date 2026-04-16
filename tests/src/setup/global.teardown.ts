import type { FullConfig } from "@playwright/test";

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // Placeholder for cleanup logic (e.g. wiping temp directories).
}
