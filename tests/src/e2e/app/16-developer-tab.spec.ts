// NOTE: The "Developer tab absent in PROD" assertion is not covered here.
// Playwright runs against `yarn dev:web`, where `import.meta.env.DEV` is
// always true, so the tab is always present. Absence is verified against a
// production bundle by running
//   yarn workspace @recrest/app build && yarn workspace @recrest/app preview
// and grepping for the dev-only testids — see the §3.5 verification section
// of the implementation plan.
import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

test.describe("app / developer tab gating", () => {
  test("is reachable in dev mode", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await expect(page.getByTestId("settings-tab-developer")).toBeVisible();
  });

  test("contains all six section testids", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId("settings-tab-developer").click();

    await expect(page.getByTestId("dev-section-build")).toBeVisible();
    await expect(page.getByTestId("dev-section-updater")).toBeVisible();
    await expect(page.getByTestId("dev-section-storage")).toBeVisible();
    await expect(page.getByTestId("dev-section-ipc")).toBeVisible();
    await expect(page.getByTestId("dev-section-i18n")).toBeVisible();
    await expect(page.getByTestId("dev-section-flags")).toBeVisible();
  });
});
