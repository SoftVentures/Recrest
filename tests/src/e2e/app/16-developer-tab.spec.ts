// NOTE: The "Developer tab absent in PROD" assertion is not covered here.
// Playwright runs against `yarn dev:web`, where `import.meta.env.DEV` is
// always true, so the tab is always present. Absence is verified against a
// production bundle by running
//   yarn workspace @recrest/app build && yarn workspace @recrest/app preview
// and grepping for the dev-only testids — see the §3.5 verification section
// of the implementation plan.
import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

test.describe("app / developer tab gating", () => {
  test("is reachable in dev mode", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await expect(page.getByTestId(TEST_IDS.settings.tab("developer"))).toBeVisible();
  });

  test("contains all six section testids", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("developer")).click();

    await expect(page.getByTestId(TEST_IDS.settings.developer.sections.build)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.sections.updater)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.sections.storage)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.sections.ipc)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.sections.i18n)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.sections.flags)).toBeVisible();
  });
});
