import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { EMPTY_SEED, SEED_SETTINGS } from "../../helpers/seed/index.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * OnboardingWizard first-run gating. `useFirstRun` shows the wizard only when
 * the install has no scan paths, no connected provider, and the user hasn't
 * dismissed it before. The default app fixture pre-dismisses it (it would
 * cover every other assertion), so these specs opt back in via
 * `showOnboarding: true` and feed a seed with empty scan paths + no providers.
 */
const FIRST_RUN_SEED = {
  ...EMPTY_SEED,
  providers: {},
  settings: { ...SEED_SETTINGS, scanPaths: [] },
};

test.describe("app / onboarding wizard", () => {
  test.use({ showOnboarding: true, seed: FIRST_RUN_SEED });

  test("first-run conditions open the wizard on the welcome step", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);

    await expect(page.getByTestId(TEST_IDS.onboarding.root)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId(TEST_IDS.onboarding.progress)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.onboarding.step("welcome"))).toBeVisible();
  });

  test("Welcome -> Basics -> Folders advances via the Continue buttons", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);

    await page.getByTestId(TEST_IDS.onboarding.welcomeNext).click();
    await expect(page.getByTestId(TEST_IDS.onboarding.step("basics"))).toBeVisible();

    await page.getByTestId(TEST_IDS.onboarding.basicsNext).click();
    await expect(page.getByTestId(TEST_IDS.onboarding.step("folders"))).toBeVisible();
  });

  test("Back from Basics returns to Welcome", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);

    await page.getByTestId(TEST_IDS.onboarding.welcomeNext).click();
    await page.getByTestId(TEST_IDS.onboarding.basicsBack).click();
    await expect(page.getByTestId(TEST_IDS.onboarding.step("welcome"))).toBeVisible();
  });
});
