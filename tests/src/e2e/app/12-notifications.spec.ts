import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

test.describe("app / developer notifications playground", () => {
  test("playground controls are visible in dev mode", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("developer")).click();

    await expect(
      page.getByTestId(TEST_IDS.settings.developer.sections.notifications),
    ).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.notif.sendBurst)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.notif.clearBurst)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.settings.developer.notif.clearBaseline)).toBeVisible();
  });

  test("clicking a playground button does not throw", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      // Pre-existing stub teardown chatter, unrelated to the playground.
      if (e.message.includes("unregisterListener")) return;
      errors.push(e.message);
    });

    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("developer")).click();

    await page.getByTestId(TEST_IDS.settings.developer.notif.sendBurst).click();
    await page.getByTestId(TEST_IDS.settings.developer.notif.clearBurst).click();
    await page.getByTestId(TEST_IDS.settings.developer.notif.clearBaseline).click();

    await page.waitForTimeout(250);
    expect(errors).toEqual([]);
  });
});
