import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

// Ad-hoc capture spec — produces screenshots of the Activity page at several
// viewport widths into `.screenshots/activity/` so design iteration has real
// seeded renders to inspect. Not part of the durable suite.
test.describe("activity capture", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");

  const sizes = [
    { name: "full-1920", width: 1920, height: 1200 },
    { name: "desktop-1440", width: 1440, height: 900 },
    { name: "laptop-1280", width: 1280, height: 820 },
    { name: "narrow-1100", width: 1100, height: 820 },
  ];

  for (const size of sizes) {
    test(`activity @ ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(AppRoute.ACTIVITY);
      await page.waitForTimeout(2800);
      await page.screenshot({
        path: `../.screenshots/activity/${size.name}.png`,
        fullPage: true,
      });
      expect(true).toBe(true);
    });
  }

  test("activity top-fold hover state", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(AppRoute.ACTIVITY);
    await page.waitForTimeout(2800);
    // Hover the first stacked-chart column to trigger its tooltip.
    const col = page.locator('[data-testid="activity-stacked-col"]').first();
    await col.hover();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "../.screenshots/activity/hover-tooltip.png",
      fullPage: false,
    });
    expect(true).toBe(true);
  });

  test("activity timeline filter states", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(AppRoute.ACTIVITY);
    await page.waitForTimeout(2800);
    await page
      .locator(".a-act-tl-card")
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "../.screenshots/activity/timeline-all.png",
      fullPage: false,
    });
  });
});
