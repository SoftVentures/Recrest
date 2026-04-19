import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

test.describe("app / settings", () => {
  test("Settings route renders the tab landmarks", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // At least the generic tab pattern renders — tab list or distinct tab buttons.
    const tabList = page.locator('[role="tablist"]').first();
    if (await tabList.count()) {
      const tabs = tabList.locator('[role="tab"]');
      expect(await tabs.count()).toBeGreaterThanOrEqual(3);
    }
  });
});
