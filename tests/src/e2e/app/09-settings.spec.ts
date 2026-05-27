import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

const EXPECTED_TABS = [
  "settings-tab-general",
  "settings-tab-accounts",
  "settings-tab-integrations",
  "settings-tab-shortcuts",
  "settings-tab-storage",
  "settings-tab-about",
] as const;

test.describe("app / settings", () => {
  test("Settings route renders the header + tab landmarks", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await expect(page.getByTestId(TEST_IDS.header.title)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.tabs)).toBeVisible();
    for (const tabId of EXPECTED_TABS) {
      await expect(page.getByTestId(tabId)).toBeVisible();
    }
    await expect(page.getByTestId(TEST_IDS.settings.panel("general"))).toBeVisible();
  });

  test("clicking a tab switches the active panel", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("about")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("about"))).toBeVisible();
  });
});
