import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * AddRepoModal — open from the header, inspect the three import panels
 * (Providers / Local / Clone), then drive the Local add flow end-to-end and
 * confirm the new repo surfaces in the repos list with its status row.
 *
 * The default seed has GitHub connected, so the modal opens on the Providers
 * tab. The stub's `add_repo` branch returns a freshly-minted Repository whose
 * status mirrors the first seed repo, which `addRepo.fulfilled` upserts into
 * the repos slice.
 */
test.describe("app / add repo modal", () => {
  test("opens from the header and exposes the three import tabs", async ({ page }) => {
    await page.goto(AppRoute.REPOS);

    await page.getByTestId(TEST_IDS.header.btnAddRepo).click();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.root)).toBeVisible();

    await expect(page.getByTestId(TEST_IDS.addRepoDialog.tab.providers)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.tab.local)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.tab.clone)).toBeVisible();

    // Switching to Local reveals the path field + submit button.
    await page.getByTestId(TEST_IDS.addRepoDialog.tab.local).click();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.path)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.submit)).toBeVisible();

    // Switching to Clone reveals the URL + destination fields.
    await page.getByTestId(TEST_IDS.addRepoDialog.tab.clone).click();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.url)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.dest)).toBeVisible();
  });

  test("adding a local repo appends a new status row to the list", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    await expect(page.getByTestId(TEST_IDS.repos.list)).toBeVisible();

    const rows = page.getByTestId(TEST_IDS.repos.row);
    const before = await rows.count();
    expect(before).toBeGreaterThan(0);

    const beforeIds = await rows.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-repo-id")),
    );

    await page.getByTestId(TEST_IDS.header.btnAddRepo).click();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.root)).toBeVisible();

    await page.getByTestId(TEST_IDS.addRepoDialog.tab.local).click();
    await page.getByTestId(TEST_IDS.addRepoDialog.path).fill("~/Code/sandbox/fresh-checkout");

    const submit = page.getByTestId(TEST_IDS.addRepoDialog.submit);
    await expect(submit).toBeEnabled();
    await submit.click();

    // The modal closes on success and the list grows by exactly one row.
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.root)).toHaveCount(0);
    await expect(rows).toHaveCount(before + 1);

    // The appended row carries a brand-new repo id (the stub mints one) and a
    // rendered status cell (presence of the row implies the status resolved).
    const afterIds = await rows.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-repo-id")),
    );
    const added = afterIds.filter((id) => id && !beforeIds.includes(id));
    expect(added).toHaveLength(1);

    const newId = added[0]!;
    await expect(
      page.locator(`[data-testid="${TEST_IDS.repos.row}"][data-repo-id="${newId}"]`),
    ).toBeVisible();
  });
});
