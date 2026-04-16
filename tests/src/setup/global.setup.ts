import type { FullConfig } from "@playwright/test";

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Placeholder for shared fixtures (e.g. test DB, mocked provider API).
  // Extend this for auth state, seeded repos, etc.
}
