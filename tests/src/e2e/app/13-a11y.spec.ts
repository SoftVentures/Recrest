import { AppRoute } from "@recrest/shared";

import { scanA11y } from "../../fixtures/a11y.fixture.js";
import { expect, test } from "../../fixtures/app.fixture.js";

interface RouteSpec {
  path: string;
  label: string;
  /**
   * Rules to disable for this route only. Prefer a narrow, per-route exclusion
   * over a global one so a genuine new violation elsewhere still fails the build.
   */
  disabledRules?: string[];
}

const ROUTES: readonly RouteSpec[] = [
  { path: AppRoute.DASHBOARD, label: "dashboard" },
  { path: AppRoute.REPOS, label: "repos" },
  { path: AppRoute.SETTINGS, label: "settings" },
  { path: AppRoute.MERGE_REQUESTS, label: "merge-requests" },
];

test.describe("app / a11y", () => {
  for (const r of ROUTES) {
    test(`axe-core: no critical/serious violations on ${r.label}`, async ({ page }) => {
      await page.goto(r.path);
      const result = await scanA11y(page, undefined, r.disabledRules ?? []);
      if (result.blocking > 0) {
        console.log(
          `[a11y ${r.label}] blocking=${result.blocking}`,
          JSON.stringify(result.violations, null, 2),
        );
      }
      expect(result.blocking, `critical+serious on ${r.label}`).toBe(0);
    });
  }
});
