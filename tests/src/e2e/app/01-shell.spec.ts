import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_PR_COUNTS, SEED_REPOS } from "../../helpers/seed/index.js";
import { TEST_IDS, navCountTestId } from "../../helpers/test-ids";

test.describe("app / shell", () => {
  test("AppShell renders Titlebar + Sidebar + Main without ErrorBoundary fallback", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId(TEST_IDS.app)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.sidebar.root)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.appMain)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.errorBoundaryFallback)).toHaveCount(0);
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

    const reposCount = page.getByTestId(navCountTestId("/repos"));
    await expect(reposCount).toHaveText(String(SEED_REPOS.length));

    const dirty = SEED_REPOS.filter((r) => r.status.dirty).length;
    const changesCount = page.getByTestId(navCountTestId("/changes"));
    await expect(changesCount).toHaveText(String(dirty));

    const mrCount = page.getByTestId(navCountTestId("/merge-requests"));
    if (await mrCount.count()) {
      // Sidebar only counts PRs from repos whose provider is connected —
      // gitlab + bitbucket are disconnected in the default seed, so the
      // visible count is 5, not the raw 8 open PRs in the seed.
      await expect(mrCount).toHaveText(String(SEED_PR_COUNTS.openVisible));
    }
  });
});
