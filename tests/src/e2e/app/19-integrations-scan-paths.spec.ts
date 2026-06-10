import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

// The seed configures a single scan root (`~/Code`) with every seed repo
// living under it, so removing it exercises the prune path and adding a
// sibling exercises the scan path — both via the dev Tauri stub's
// `forget_repos_under_path` / `scan_repos` branches.
test.describe("app / settings — scan paths", () => {
  test("removing a scan path drops its row from the list", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("integrations")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("integrations"))).toBeVisible();

    const row = page.getByTestId(TEST_IDS.settings.integrations.scanRemove("~/Code"));
    await expect(row).toBeVisible();
    await row.click();
    await expect(row).toHaveCount(0);
  });

  test("adding a scan path appends a new row", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("integrations")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("integrations"))).toBeVisible();

    await page.getByTestId(TEST_IDS.settings.integrations.scanInput).fill("~/Projects");
    await page.getByTestId(TEST_IDS.settings.integrations.scanAdd).click();

    await expect(
      page.getByTestId(TEST_IDS.settings.integrations.scanRemove("~/Projects")),
    ).toBeVisible();
    // The original root is untouched by an add.
    await expect(
      page.getByTestId(TEST_IDS.settings.integrations.scanRemove("~/Code")),
    ).toBeVisible();
  });
});
