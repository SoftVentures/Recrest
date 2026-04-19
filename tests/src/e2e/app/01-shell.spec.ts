import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_PR_COUNTS, SEED_REPOS } from "../../helpers/seed/index.js";
import { APP_COPY } from "../../helpers/selectors.js";

test.describe("app / shell", () => {
  test("AppShell renders Titlebar + Sidebar + Main without ErrorBoundary fallback", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".app")).toBeVisible();
    await expect(page.getByRole("complementary", { name: /Primary/i })).toBeVisible();
    await expect(page.locator("main.a-main")).toBeVisible();
    // ErrorBoundary render = fallback text; absent when the shell is healthy.
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
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
      "mobile auto-collapses the sidebar; counts are rendered as dots without text",
    );
    await page.goto(AppRoute.REPOS);
    const sidebar = page.getByRole("complementary", { name: /Primary/i });

    // Repos count (8 in default seed)
    const reposItem = sidebar
      .getByRole("button", { name: new RegExp(APP_COPY.en.nav.repos, "i") })
      .first();
    await expect(reposItem).toContainText(String(SEED_REPOS.length));

    // Changes (3 dirty)
    const dirty = SEED_REPOS.filter((r) => r.status.dirty).length;
    const changesItem = sidebar
      .getByRole("button", { name: new RegExp(APP_COPY.en.nav.changes, "i") })
      .first();
    await expect(changesItem).toContainText(String(dirty));

    // MRs — connected-provider badge (only GitHub in seed).
    const mrItem = sidebar.getByRole("button", { name: new RegExp("merge requests", "i") }).first();
    if (await mrItem.count()) {
      await expect(mrItem).toContainText(new RegExp(String(SEED_PR_COUNTS.open)));
    }
  });
});
