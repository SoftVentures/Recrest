import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

const ROUTES = [
  AppRoute.DASHBOARD,
  AppRoute.REPOS,
  AppRoute.CHANGES,
  AppRoute.MERGE_REQUESTS,
  AppRoute.BRANCHES,
  AppRoute.ACTIVITY,
  AppRoute.SETTINGS,
] as const;

test.describe("app / navigation", () => {
  for (const route of ROUTES) {
    test(`loads ${route} without crashing`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByTestId("app")).toBeVisible();
      await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${route.replace(/\//g, "\\/")}(\\?|$)`));
    });
  }

  test("legacy /pull-requests redirects to /merge-requests", async ({ page }) => {
    await page.goto(AppRoute.MERGE_REQUESTS_LEGACY);
    await expect(page).toHaveURL(new RegExp(`${AppRoute.MERGE_REQUESTS.replace(/\//g, "\\/")}$`));
  });
});
