import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * Plan 1 §A.7 — clicking an MR row inside the full-width Repo-detail view
 * should open an inline drawer with the MR's basics. The user must NOT be
 * navigated away to the Merge-Requests view.
 */
test.describe("app / repo detail / MR drawer (Plan 1 §A.7)", () => {
  test("clicking an MR row opens an inline drawer and stays on the repo route", async ({
    page,
  }) => {
    await page.goto("/repo/repo-recrest");

    await expect(page.getByTestId(TEST_IDS.repoDetail.mrDrawer)).toHaveCount(0);

    const firstRow = page.getByTestId(TEST_IDS.repoDetail.mrRow).first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    await firstRow.click();

    await expect(page.getByTestId(TEST_IDS.repoDetail.mrDrawer)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.mr.detailPanel)).toBeVisible();
    await expect(page).toHaveURL(/\/repo\/repo-recrest$/);
  });
});
