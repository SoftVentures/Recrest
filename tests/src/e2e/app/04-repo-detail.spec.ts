import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_REPOS } from "../../helpers/seed/index.js";

test.describe("app / repo detail pane", () => {
  test("click repo row opens the detail pane with repo name + path", async ({ page }) => {
    const target = SEED_REPOS[3]!;
    await page.goto(AppRoute.REPOS);

    await page
      .locator(
        `[data-testid="repo-row"][data-repo-id="${target.id}"] [data-testid="repo-row-select"]`,
      )
      .click();

    const detail = page.getByTestId("detail-pane");
    await expect(detail).toBeVisible({ timeout: 10_000 });
    await expect(detail).toHaveAttribute("data-repo-id", target.id);
    await expect(detail).toContainText(target.name);
  });
});
