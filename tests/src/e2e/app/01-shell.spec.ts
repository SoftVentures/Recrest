import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_PR_COUNTS, SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / shell", () => {
  test("AppShell renders Titlebar + Sidebar + Main without ErrorBoundary fallback", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("app")).toBeVisible();
    await expect(page.getByTestId("sidebar")).toBeVisible();
    await expect(page.getByTestId("app-main")).toBeVisible();
    await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
  });

  test("redirects / to /dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`${AppRoute.DASHBOARD.replace("/", "\\/")}$`));
  });

  test("Sidebar shows repo count + MR count + dirty count from the seed", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "app-mobile",
      "mobile auto-collapses the sidebar; counts are rendered as dots",
    );
    await page.goto(AppRoute.REPOS);

    const reposCount = page.getByTestId("nav-repos-count");
    await expect(reposCount).toHaveText(String(SEED_REPOS.length));

    const dirty = SEED_REPOS.filter((r) => r.status.dirty).length;
    const changesCount = page.getByTestId("nav-changes-count");
    await expect(changesCount).toHaveText(String(dirty));

    const mrCount = page.getByTestId("nav-merge-requests-count");
    if (await mrCount.count()) {
      await expect(mrCount).toHaveText(String(SEED_PR_COUNTS.open));
    }
  });
});
