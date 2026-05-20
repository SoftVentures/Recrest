import { expect, test } from "../../fixtures/app.fixture.js";

/**
 * Plan 1 §A.7 — clicking a PR row inside the full-width Repo-detail view
 * should open an inline drawer with the PR's basics. The user must NOT be
 * navigated away to the Merge-Requests view.
 */
test.describe("app / repo detail / PR drawer (Plan 1 §A.7)", () => {
  test("clicking a PR row opens an inline drawer and stays on the repo route", async ({ page }) => {
    await page.goto("/repo/repo-recrest");

    // Drawer is hidden until a PR row is clicked.
    await expect(page.getByTestId("repo-detail-pr-drawer")).toHaveCount(0);

    // Wait for the PR rows to render (they hydrate via the seeded thunk).
    const firstRow = page.getByTestId("repo-detail-pr-row").first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    await firstRow.click();

    // Drawer + inner panel are now visible, and we stayed on the repo route.
    await expect(page.getByTestId("repo-detail-pr-drawer")).toBeVisible();
    await expect(page.getByTestId("mr-detail-panel")).toBeVisible();
    await expect(page).toHaveURL(/\/repo\/repo-recrest$/);
  });
});
