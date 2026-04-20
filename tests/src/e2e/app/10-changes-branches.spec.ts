import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / changes + branches", () => {
  test("Changes route only lists dirty repos from the seed", async ({ page }) => {
    await page.goto(AppRoute.CHANGES);
    await expect(page.getByTestId("changes-page")).toBeVisible();

    const dirty = SEED_REPOS.filter((r) => r.status.dirty);
    const clean = SEED_REPOS.filter((r) => !r.status.dirty);

    for (const r of dirty) {
      await expect(page.locator(`[data-testid="repo-row"][data-repo-id="${r.id}"]`)).toBeVisible();
    }
    for (const r of clean) {
      await expect(page.locator(`[data-testid="repo-row"][data-repo-id="${r.id}"]`)).toHaveCount(0);
    }
  });

  test("Branches route loads", async ({ page }) => {
    await page.goto(AppRoute.BRANCHES);
    await expect(page.getByTestId("branches-page")).toBeVisible();
    await expect(page.getByTestId("error-boundary-fallback")).toHaveCount(0);
  });
});
