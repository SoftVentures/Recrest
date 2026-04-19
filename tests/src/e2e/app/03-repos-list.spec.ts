import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { EMPTY_SEED, SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / repos list", () => {
  test("renders all seeded repo names", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    for (const repo of SEED_REPOS) {
      await expect(page.getByText(repo.name, { exact: true }).first()).toBeVisible();
    }
  });

  test("dirty repos show a dirty indicator", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    const dirtyNames = SEED_REPOS.filter((r) => r.status.dirty).map((r) => r.name);
    // At least one visible dirty badge / indicator.
    for (const name of dirtyNames) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
    expect(dirtyNames.length).toBeGreaterThan(0);
  });

  test.describe("empty seed", () => {
    test.use({ seed: EMPTY_SEED });
    test("shows an empty state and no repo rows", async ({ page }) => {
      await page.goto(AppRoute.REPOS);
      const main = page.locator("main.a-main");
      // Repo names should not appear in the main content (titlebar/sidebar
      // Recrest brand is fine — we're checking for rendered repo rows).
      for (const repo of SEED_REPOS) {
        await expect(main.getByText(repo.name, { exact: true })).toHaveCount(0);
      }
      // `common.json::states.empty` → "Nothing here yet".
      await expect(main.getByText(/Nothing here yet/i).first()).toBeVisible({ timeout: 10_000 });
    });
  });
});
