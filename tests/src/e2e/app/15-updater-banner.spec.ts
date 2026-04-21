import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

/**
 * The DeveloperTab's "Simulate updater event" button dispatches a
 * `setUpdaterBanner` Redux action with a deterministic payload. Because the
 * banner is mounted in `AppShell` unconditionally, this lets us exercise both
 * render variants (install vs. download) from a plain browser session — no
 * real Tauri updater call is made.
 */
test.describe("app / updater banner variants", () => {
  test("canAutoInstall=true renders install button", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId("settings-tab-developer").click();

    const canAuto = page.getByTestId("dev-updater-sim-can-auto-install");
    await expect(canAuto).toBeVisible();
    if ((await canAuto.getAttribute("aria-checked")) !== "true") {
      await canAuto.click();
    }
    await page.getByTestId("dev-updater-emit").click();

    await expect(page.getByTestId("updater-banner")).toBeVisible();
    await expect(page.getByTestId("updater-banner-install")).toBeVisible();
    await expect(page.getByTestId("updater-banner-download")).toHaveCount(0);
  });

  test("canAutoInstall=false renders download button", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId("settings-tab-developer").click();

    const canAuto = page.getByTestId("dev-updater-sim-can-auto-install");
    await expect(canAuto).toBeVisible();
    if ((await canAuto.getAttribute("aria-checked")) === "true") {
      await canAuto.click();
    }
    await page.getByTestId("dev-updater-emit").click();

    await expect(page.getByTestId("updater-banner")).toBeVisible();
    await expect(page.getByTestId("updater-banner-download")).toBeVisible();
    await expect(page.getByTestId("updater-banner-install")).toHaveCount(0);
  });
});
