import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

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
    await page.getByTestId(TEST_IDS.settings.tab("developer")).click();

    const canAuto = page.getByTestId(TEST_IDS.settings.developer.updater.simCanAutoInstall);
    await expect(canAuto).toBeVisible();
    // MUI's switch is a native <input type="checkbox"> behind the styled track —
    // it has no aria-checked, so read the real checked state off the input.
    if (!(await canAuto.locator("input").isChecked())) {
      await canAuto.click();
    }
    await page.getByTestId(TEST_IDS.settings.developer.updater.emit).click();

    await expect(page.getByTestId(TEST_IDS.updaterBanner.root)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.updaterBanner.install)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.updaterBanner.download)).toHaveCount(0);
  });

  test("canAutoInstall=false renders download button", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("developer")).click();

    const canAuto = page.getByTestId(TEST_IDS.settings.developer.updater.simCanAutoInstall);
    await expect(canAuto).toBeVisible();
    // MUI's switch is a native <input type="checkbox"> behind the styled track —
    // it has no aria-checked, so read the real checked state off the input.
    if (await canAuto.locator("input").isChecked()) {
      await canAuto.click();
    }
    await page.getByTestId(TEST_IDS.settings.developer.updater.emit).click();

    await expect(page.getByTestId(TEST_IDS.updaterBanner.root)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.updaterBanner.download)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.updaterBanner.install)).toHaveCount(0);
  });

  test("a package-managed install gets a hint instead of any install action", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("developer")).click();

    const canAuto = page.getByTestId(TEST_IDS.settings.developer.updater.simCanAutoInstall);
    await expect(canAuto).toBeVisible();
    if (!(await canAuto.locator("input").isChecked())) {
      await canAuto.click();
    }
    const packageManaged = page.getByTestId(TEST_IDS.settings.developer.updater.simPackageManaged);
    await packageManaged.click();
    await page.getByTestId(TEST_IDS.settings.developer.updater.emit).click();

    await expect(page.getByTestId(TEST_IDS.updaterBanner.root)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.updaterBanner.channelHint)).toBeVisible();
    // `canAutoInstall` is on, yet the channel gate still wins.
    await expect(page.getByTestId(TEST_IDS.updaterBanner.install)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.updaterBanner.download)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.updaterBanner.dismiss)).toBeVisible();
  });
});
