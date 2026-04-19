import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / repo detail pane", () => {
  test("click repo row opens the detail pane with repo name + path", async ({ page }) => {
    const target = SEED_REPOS[3]!;
    await page.goto(AppRoute.REPOS);
    await page.getByText(target.name, { exact: true }).first().click();

    const detail = page.locator('[class*="a-detail"], [class*="DetailPane"], aside.detail');
    await expect(detail.first()).toBeVisible({ timeout: 10_000 });
    await expect(detail.first()).toContainText(target.name);
  });
});
