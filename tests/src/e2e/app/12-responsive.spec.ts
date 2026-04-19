import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { VIEWPORTS } from "../../helpers/viewports.js";

test.describe("app / responsive", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "desktop chromium sweep only");

  for (const vp of [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop]) {
    test(`no horizontal scroll at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(AppRoute.REPOS);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
    });
  }

  test("sidebar auto-collapses on narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto("/");
    const sidebar = page.getByRole("complementary", { name: /Primary/i });
    await expect(sidebar).toHaveClass(/collapsed/);
  });
});
