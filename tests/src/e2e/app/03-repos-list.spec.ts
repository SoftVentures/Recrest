import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { EMPTY_SEED, SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / repos list", () => {
  test("renders all seeded repo rows", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    await expect(page.getByTestId("repo-list")).toBeVisible();
    for (const repo of SEED_REPOS) {
      await expect(
        page.locator(`[data-testid="repo-row"][data-repo-id="${repo.id}"]`),
      ).toBeVisible();
    }
  });

  test("dirty repos carry a dirty marker", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    const dirtyIds = SEED_REPOS.filter((r) => r.status.dirty).map((r) => r.id);
    expect(dirtyIds.length).toBeGreaterThan(0);
    for (const id of dirtyIds) {
      await expect(
        page.locator(`[data-testid="repo-row"][data-repo-id="${id}"][data-dirty="true"]`),
      ).toBeVisible();
    }
  });

  test.describe("empty seed", () => {
    test.use({ seed: EMPTY_SEED });
    test("shows an empty state and no repo rows", async ({ page }) => {
      await page.goto(AppRoute.REPOS);
      await expect(page.getByTestId("repo-row")).toHaveCount(0);
      await expect(page.getByTestId("repo-list-empty")).toBeVisible({ timeout: 10_000 });
    });
  });
});
