import { AppRoute, TauriCommand } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * "Pull all" runs a pull across every registered repo. Before the August 2026
 * audit it fired straight from the dashboard tile with no confirmation, and the
 * backend dropped per-repo failures so the toast reported a success count that
 * silently excluded them.
 *
 * The guard that matters here is the one a unit test cannot express: cancelling
 * must not reach the backend at all. That is read off the stub's command log,
 * because an un-dispatched IPC call leaves no trace in the DOM.
 */
test.describe("app / pull all confirmation", () => {
  const stubCalls = (page: import("@playwright/test").Page) =>
    page.evaluate(
      () => (window as unknown as { __RECREST_STUB_CALLS__: string[] }).__RECREST_STUB_CALLS__,
    );

  test("asks before pulling every repo", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    await page.getByTestId(TEST_IDS.dashboard.qa.pullAll).click();
    await expect(page.getByTestId(TEST_IDS.confirmDialog.root)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.confirmDialog.confirm)).toBeVisible();
  });

  test("cancelling leaves every repo untouched", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    await page.getByTestId(TEST_IDS.dashboard.qa.pullAll).click();
    await page.getByTestId(TEST_IDS.confirmDialog.cancel).click();

    await expect(page.getByTestId(TEST_IDS.confirmDialog.root)).toHaveCount(0);
    expect(await stubCalls(page)).not.toContain(TauriCommand.GIT_PULL_ALL);
  });

  test("confirming dispatches the pull and closes the dialog", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    await page.getByTestId(TEST_IDS.dashboard.qa.pullAll).click();
    await page.getByTestId(TEST_IDS.confirmDialog.confirm).click();

    await expect(page.getByTestId(TEST_IDS.confirmDialog.root)).toHaveCount(0);
    await expect.poll(async () => await stubCalls(page)).toContain(TauriCommand.GIT_PULL_ALL);
  });
});
