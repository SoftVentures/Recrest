import { AppRoute } from "@recrest/shared";

import { scanA11y } from "../../fixtures/a11y.fixture.js";
import { expect, test } from "../../fixtures/app.fixture.js";

const ROUTES = [
  { path: AppRoute.DASHBOARD, label: "dashboard" },
  { path: AppRoute.REPOS, label: "repos" },
  { path: AppRoute.SETTINGS, label: "settings" },
  { path: AppRoute.MERGE_REQUESTS, label: "merge-requests" },
] as const;

const DISABLED_RULES: string[] = [];

test.describe("app / a11y", () => {
  for (const r of ROUTES) {
    test(`axe-core: no critical/serious violations on ${r.label}`, async ({ page }) => {
      await page.goto(r.path);
      const result = await scanA11y(page, undefined, DISABLED_RULES);
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
