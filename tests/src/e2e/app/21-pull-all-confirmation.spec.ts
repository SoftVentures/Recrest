import { AppRoute, TauriCommand } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { STUB_CALLS_GLOBAL } from "../../helpers/constants.js";
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
  const stubCalls = (page: import("@playwright/test").Page): Promise<string[]> =>
    page.evaluate(
      (key) => (window as unknown as Record<string, string[]>)[key] ?? [],
      STUB_CALLS_GLOBAL,
    );

  test("asks before pulling every repo", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    await page.getByTestId(TEST_IDS.dashboard.qa.pullAll).click();
    await expect(page.getByTestId(TEST_IDS.confirmDialog.root)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.confirmDialog.confirm)).toBeVisible();
  });

  /**
   * Resolves once two consecutive readings of the stub's command log are
   * identical — i.e. nothing is still being dispatched. A negative assertion
   * fired the instant the dialog closes would also pass for a *deferred*
   * dispatch (a thunk chained off the close transition, a debounced handler),
   * because "hasn't happened yet" and "will never happen" look the same at t=0.
   */
  const waitForQuietCommandLog = async (page: import("@playwright/test").Page): Promise<void> => {
    let previous = -1;
    await expect
      .poll(
        async () => {
          const { length } = await stubCalls(page);
          const settled = length === previous;
          previous = length;
          return settled;
        },
        // Well under the app's 10 s initial updater check, so a background poll
        // cannot keep the log growing and time this out.
        { timeout: 5_000, intervals: [200, 200, 300, 500, 1_000] },
      )
      .toBe(true);
  };

  test("cancelling leaves every repo untouched", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    await page.getByTestId(TEST_IDS.dashboard.qa.pullAll).click();
    await page.getByTestId(TEST_IDS.confirmDialog.cancel).click();

    await expect(page.getByTestId(TEST_IDS.confirmDialog.root)).toHaveCount(0);
    await waitForQuietCommandLog(page);

    const calls = await stubCalls(page);
    // Guards a second way this could pass vacuously: if the log were empty —
    // global renamed, stub not installed — `not.toContain` would succeed no
    // matter what the app dispatched.
    expect(calls.length).toBeGreaterThan(0);
    expect(calls).not.toContain(TauriCommand.GIT_PULL_ALL);
  });

  test("confirming dispatches the pull and closes the dialog", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    await page.getByTestId(TEST_IDS.dashboard.qa.pullAll).click();
    await page.getByTestId(TEST_IDS.confirmDialog.confirm).click();

    await expect(page.getByTestId(TEST_IDS.confirmDialog.root)).toHaveCount(0);
    await expect.poll(async () => await stubCalls(page)).toContain(TauriCommand.GIT_PULL_ALL);
  });
});
