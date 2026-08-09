import type { Page } from "@playwright/test";

import { AppRoute, PROVIDER_API_URLS, PROVIDER_NAMES } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { DEFAULT_SEED } from "../../helpers/seed/index.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * Two i18n defects from the August 2026 audit that every unit test was blind to,
 * because both failure modes render *something* — just not the translation.
 *
 * 1. i18next splits a key on `:` (its default `nsSeparator`), so every PAT scope
 *    whose id carries a colon resolved to a bogus namespace and fell back to the
 *    raw id. Bitbucket's ids are all colon-shaped, so its entire scope list was
 *    unexplained.
 * 2. `stash_index` was `stash@{{{index}}}` — i18next does not interpolate a
 *    triple brace, so every stash row printed the template verbatim.
 *
 * The scope assertion is deliberately "the label is not the bare id" rather than
 * an exact string: it pins the failure mode, not the copy, so a translation edit
 * cannot turn this into a false red.
 */
test.describe("app / runtime-built translation keys", () => {
  async function openPatForm(page: Page, providerId: string): Promise<void> {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("accounts")).click();
    const row = page.getByTestId(TEST_IDS.settings.accounts.providerRow(providerId));
    await expect(row).toBeVisible();
    await row.getByTestId(TEST_IDS.settings.accounts.connectButton).click();
  }

  async function expectScopesResolved(page: Page, scopes: readonly string[]): Promise<void> {
    for (const scope of scopes) {
      const item = page.getByTestId(TEST_IDS.onboarding.patHelpScope(scope));
      await expect(item).toBeVisible();
      await expect(item).not.toHaveText(scope);
    }
  }

  test("bitbucket scope labels resolve despite the colon in every id", async ({ page }) => {
    await openPatForm(page, "bitbucket");
    await expectScopesResolved(page, ["account:read", "repository:read", "pullrequest:read"]);
  });

  test.describe("with github disconnected", () => {
    test.use({
      seed: {
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
          },
        },
      },
    });

    test("github scope labels resolve for the colon-shaped ids", async ({ page }) => {
      await openPatForm(page, "github");
      await expectScopesResolved(page, ["read:user", "read:org"]);
    });
  });

  test("stash rows print git's own stash@{n} notation", async ({ page }) => {
    await page.goto(AppRoute.REPO.replace(":repoId", "repo-local-dev-stacks"));

    await page.getByTestId(TEST_IDS.workingCopy.stashSave).click();

    const label = page.getByTestId(TEST_IDS.workingCopy.stashIndex(0));
    await expect(label).toBeVisible();
    await expect(label).toHaveText("stash@{0}");
  });
});
