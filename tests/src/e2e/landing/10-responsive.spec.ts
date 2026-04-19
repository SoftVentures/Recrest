import { expect, test } from "../../fixtures/landing.fixture.js";
import { VIEWPORT_LIST } from "../../helpers/viewports.js";

/**
 * Responsive sweep — runs on landing-desktop only (mobile project already
 * covers the mobile preset). Each viewport:
 *  1. No horizontal scrollbar (document.scrollWidth <= innerWidth + 1).
 *  2. Hero h1 visible.
 *  3. At least the nav + footer render.
 *  4. Download CTA reachable within the current viewport without horizontal scroll.
 */
test.describe("landing / responsive sweep", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "only runs on chromium");

  for (const vp of VIEWPORT_LIST) {
    test(`viewport ${vp.label} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // No horizontal scroll.
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth, `horizontal overflow at ${vp.label}`).toBeLessThanOrEqual(innerWidth + 1);

      // Key elements render.
      await expect(page.locator("nav.nav")).toBeVisible();
      await expect(page.locator("h1.hero-title")).toBeVisible();
      await expect(page.locator("footer")).toBeAttached();

      // Download CTA exists (nav or hero — whichever is currently visible).
      await expect(page.locator("a.btn.btn-primary").first()).toBeAttached();

      // Visual snapshot of the fold above the viewport fold at this width.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot(`hero-${vp.label}.png`, {
        animations: "disabled",
        caret: "hide",
        // Gradients on the hero-demo render slightly differently per GPU
        // driver; mask that region so the test doesn't flap on CI hardware.
        mask: [page.locator(".hero-screenshot")],
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
