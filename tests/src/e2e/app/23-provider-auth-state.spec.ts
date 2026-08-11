import {
  AppRoute,
  PROVIDER_API_URLS,
  PROVIDER_NAMES,
  type ProviderConnection,
} from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { PILL_TONE_ATTR, PROVIDER_STATUS_COPY } from "../../helpers/constants.js";
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
 *
 * Two assertions per state, on purpose, and neither hard-codes English:
 *
 *  - `data-tone` on the pill is the STATE contract. Copy-independent, so a
 *    rewording cannot redden this spec — which inline `/token rejected/i`
 *    regexes did, the exact failure mode `22-i18n-runtime-keys` argues against.
 *  - the text is still checked, via `PROVIDER_STATUS_COPY` reading the app's EN
 *    bundle. Dropping it would leave the spec blind to the bug spec 22 exists
 *    for: a tone can be right while the label renders as a raw, unresolved
 *    translation key. The KEY is the contract; the string is looked up, not
 *    retyped.
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
        authState: "disconnected",
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
      await expect(pill).toHaveAttribute(PILL_TONE_ATTR, "invalid");
      await expect(pill).toHaveText(PROVIDER_STATUS_COPY.invalid);
    });
  });

  test.describe("never connected", () => {
    test.use({ seed: seedGithub({ authState: "disconnected" }) });

    test("no stored credential reads as not connected", async ({ page }) => {
      const pill = await githubPill(page);
      await expect(pill).toHaveAttribute(PILL_TONE_ATTR, "disconnected");
      await expect(pill).toHaveText(PROVIDER_STATUS_COPY.disconnected);
    });
  });

  test.describe("could not verify", () => {
    // `connected: true` on purpose: the backend reports `unreachable` when the
    // credential is stored but the host could not be reached, and going offline
    // must not read as a disconnect. The pill still has to say so — otherwise
    // an unverifiable account is pixel-identical to a verified one.
    test.use({ seed: seedGithub({ authState: "unreachable", connected: true }) });

    test("an unreachable host is distinguishable from a verified account", async ({ page }) => {
      const pill = await githubPill(page);
      await expect(pill).toHaveAttribute(PILL_TONE_ATTR, "unreachable");
      await expect(pill).toHaveText(PROVIDER_STATUS_COPY.unreachable);
      // The account stays usable — Disconnect is the affordance that proves it.
      const row = page.getByTestId(TEST_IDS.settings.accounts.providerRow("github"));
      await expect(row.getByTestId(TEST_IDS.settings.accounts.disconnectButton)).toBeVisible();
    });
  });

  test("an accepted token still reads as connected", async ({ page }) => {
    const pill = await githubPill(page);
    await expect(pill).toHaveAttribute(PILL_TONE_ATTR, "connected");
    // `toHaveText` with a string is an exact match, so this still distinguishes
    // "Connected" from "Not connected" without an anchored regex.
    await expect(pill).toHaveText(PROVIDER_STATUS_COPY.connected);
  });
});
