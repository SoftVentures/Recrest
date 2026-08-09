import {
  AppRoute,
  PROVIDER_API_URLS,
  PROVIDER_NAMES,
  type ProviderConnection,
} from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { DEFAULT_SEED } from "../../helpers/seed/index.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * Before the August 2026 audit, `is_authenticated()` only meant "a token string
 * exists" and `username()` swallowed every non-2xx into `Ok(None)`, so a revoked
 * PAT still showed the account as connected — the user had no way to tell that
 * the credential, not the network, was the problem.
 *
 * The backend now reports an explicit `authState`, and the row has to
 * distinguish a *rejected* token from one that was never entered: the first
 * needs replacing, the second needs adding.
 */
test.describe("app / provider auth state", () => {
  const seedGithub = (overrides: Partial<ProviderConnection>) => ({
    ...DEFAULT_SEED,
    providers: {
      ...DEFAULT_SEED.providers,
      github: {
        providerId: "github",
        displayName: PROVIDER_NAMES.github,
        connected: false,
        username: null,
        supportsOauth: true,
        baseUrl: PROVIDER_API_URLS.github,
        ...overrides,
      } satisfies ProviderConnection,
    },
  });

  async function githubPill(page: import("@playwright/test").Page) {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("accounts")).click();
    return page.getByTestId(TEST_IDS.settings.accounts.statusPill("github"));
  }

  test.describe("token rejected", () => {
    test.use({ seed: seedGithub({ authState: "invalid" }) });

    test("a revoked token reads as rejected, not as never-connected", async ({ page }) => {
      const pill = await githubPill(page);
      await expect(pill).toBeVisible();
      await expect(pill).toHaveText(/token rejected/i);
    });
  });

  test.describe("never connected", () => {
    test.use({ seed: seedGithub({ authState: "disconnected" }) });

    test("no stored credential reads as not connected", async ({ page }) => {
      const pill = await githubPill(page);
      await expect(pill).toHaveText(/not connected/i);
    });
  });

  test("an accepted token still reads as connected", async ({ page }) => {
    const pill = await githubPill(page);
    await expect(pill).toHaveText(/^connected$/i);
  });
});
