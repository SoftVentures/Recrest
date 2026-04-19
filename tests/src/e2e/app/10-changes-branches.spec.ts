import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / changes + branches", () => {
  test("Changes route only lists dirty repos from the seed", async ({ page }) => {
    await page.goto(AppRoute.CHANGES);
    const main = page.locator("main.a-main");
    const dirty = SEED_REPOS.filter((r) => r.status.dirty);
    const clean = SEED_REPOS.filter((r) => !r.status.dirty);
    for (const r of dirty) {
      await expect(main.getByText(r.name, { exact: true }).first()).toBeVisible();
    }
    // Assert clean repos are absent *inside the main content*, ignoring
    // titlebar / sidebar mentions (Recrest brand label etc.).
    for (const r of clean) {
      await expect(main.getByText(r.name, { exact: true })).toHaveCount(0);
    }
  });

  test("Branches route loads", async ({ page }) => {
    await page.goto(AppRoute.BRANCHES);
    await expect(page.locator(".app")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });
});
