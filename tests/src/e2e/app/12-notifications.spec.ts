import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

test.describe("app / developer notifications playground", () => {
  test("playground controls are visible in dev mode", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId("settings-tab-developer").click();

    await expect(page.getByTestId("dev-section-notifications")).toBeVisible();
    await expect(page.getByTestId("dev-notif-send-burst")).toBeVisible();
    await expect(page.getByTestId("dev-notif-clear-burst")).toBeVisible();
    await expect(page.getByTestId("dev-notif-clear-baseline")).toBeVisible();
  });

  test("clicking a playground button does not throw", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      // Pre-existing stub teardown chatter, unrelated to the playground.
      if (e.message.includes("unregisterListener")) return;
      errors.push(e.message);
    });

    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId("settings-tab-developer").click();

    await page.getByTestId("dev-notif-send-burst").click();
    await page.getByTestId("dev-notif-clear-burst").click();
    await page.getByTestId("dev-notif-clear-baseline").click();

    await page.waitForTimeout(250);
    expect(errors).toEqual([]);
  });
});
