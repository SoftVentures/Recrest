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

  test("provider step connects GitLab and Bitbucket via token, not just GitHub", async ({
    page,
  }) => {
    await page.goto(AppRoute.DASHBOARD);

    await page.getByTestId(TEST_IDS.onboarding.welcomeNext).click();
    await page.getByTestId(TEST_IDS.onboarding.basicsNext).click();

    // The Folders step gates Continue on at least one scan path — add one so we
    // can advance to the provider step.
    await page.getByTestId(TEST_IDS.onboarding.pickFolderInput).fill("/tmp/recrest-projects");
    await page.getByTestId(TEST_IDS.onboarding.pickFolderInput).press("Enter");
    await page.getByTestId(TEST_IDS.onboarding.pickFolderNext).click();

    await expect(page.getByTestId(TEST_IDS.onboarding.step("provider"))).toBeVisible();

    // GitLab and Bitbucket are now first-class onboarding options (previously
    // disabled "coming soon" stubs). Each must select + connect via a token;
    // Bitbucket additionally requires a username for its app-password auth.
    for (const id of ["gitlab", "bitbucket"] as const) {
      await page.getByTestId(TEST_IDS.onboarding.providerPick(id)).click();
      if (id === "bitbucket") {
        await page.getByTestId(TEST_IDS.onboarding.providerUsername).fill("octo-user");
      }
      await page.getByTestId(TEST_IDS.onboarding.providerToken).fill(`token-${id}`);
      await page.getByTestId(TEST_IDS.onboarding.providerConnect).click();
      await expect(page.getByTestId(TEST_IDS.onboarding.providerConnected)).toBeVisible();
    }
  });

  test("provider step exposes a self-hosted base-URL field and a token-help link", async ({
    page,
  }) => {
    await page.goto(AppRoute.DASHBOARD);

    await page.getByTestId(TEST_IDS.onboarding.welcomeNext).click();
    await page.getByTestId(TEST_IDS.onboarding.basicsNext).click();
    await page.getByTestId(TEST_IDS.onboarding.pickFolderInput).fill("/tmp/recrest-projects");
    await page.getByTestId(TEST_IDS.onboarding.pickFolderInput).press("Enter");
    await page.getByTestId(TEST_IDS.onboarding.pickFolderNext).click();

    await expect(page.getByTestId(TEST_IDS.onboarding.step("provider"))).toBeVisible();

    // The token-help affordance is always available for the active provider —
    // `PatHelpPanel` renders the required scopes plus the "create token" link.
    await expect(page.getByTestId(TEST_IDS.onboarding.patHelpCreate)).toBeVisible();

    // Self-hosted: revealing and saving a base URL flips the provider onto the
    // custom server (round-trips through `set_provider_base_url`).
    await page.getByTestId(TEST_IDS.onboarding.providerPick("gitlab")).click();
    await page.getByTestId(TEST_IDS.onboarding.providerSelfHosted).click();
    await page
      .getByTestId(TEST_IDS.onboarding.providerBaseUrl)
      .fill("https://gitlab.example.com/api/v4");
    await page.getByTestId(TEST_IDS.onboarding.providerBaseUrlSave).click();
    // The token field stays available for the now-self-hosted provider.
    await expect(page.getByTestId(TEST_IDS.onboarding.providerToken)).toBeVisible();
  });
});
