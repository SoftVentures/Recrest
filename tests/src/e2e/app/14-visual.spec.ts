import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

/**
 * Visual regression on the seeded app. Dates, relative timestamps, and
 * commit-activity sparklines are masked because their rendering is not
 * deterministic at the pixel level — seed timestamps are absolute ISO
 * strings but the UI formats them as relative durations ("2 h ago"),
 * which drift whenever the clock moves.
 *
 * Runs only on `app-desktop` to avoid fighting platform font rendering
 * differences on mobile / WebKit.
 */
test.describe("app / visual", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "chromium only — fonts + antialiasing differ across platforms",
  );
  test.skip(
    !!process.env.CI,
    "visual baselines are platform-specific and not committed; run locally",
  );

  test.use({ uiLocale: "en" });

  const VIEWS = [
    { path: AppRoute.DASHBOARD, name: "dashboard" },
    { path: AppRoute.REPOS, name: "repos" },
    { path: AppRoute.CHANGES, name: "changes" },
    { path: AppRoute.BRANCHES, name: "branches" },
    { path: AppRoute.MERGE_REQUESTS, name: "merge-requests" },
    { path: AppRoute.SETTINGS, name: "settings" },
  ] as const;

  for (const view of VIEWS) {
    test(`${view.name} matches baseline`, async ({ page }) => {
      await page.goto(view.path);
      // Let suspense / icon fonts settle.
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`${view.name}.png`, {
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        mask: [
          // Relative time copy + commit sparklines + avatar gradients.
          page.locator(".a-dash-chart"),
          page.locator(".a-dash-attn-sub"),
          page.locator(".a-c-activity"),
          page.locator(".a-dash-card-m"),
          page.locator(".a-mr-row-meta"),
          page.locator(".a-dp-path"),
        ],
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
