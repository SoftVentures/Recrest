import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { APP_COPY } from "../../helpers/selectors.js";

test.describe("app / locale", () => {
  test.describe("german boot", () => {
    test.use({ uiLocale: "de" });
    test("sidebar uses German labels", async ({ page }) => {
      await page.goto(AppRoute.DASHBOARD);
      const sidebar = page.getByRole("complementary", { name: /Primary/i });
      await expect(
        sidebar.getByRole("button", { name: new RegExp(APP_COPY.de.nav.settings, "i") }).first(),
      ).toBeVisible();
    });
  });

  test("english boot uses English labels", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    const sidebar = page.getByRole("complementary", { name: /Primary/i });
    await expect(
      sidebar.getByRole("button", { name: new RegExp(APP_COPY.en.nav.settings, "i") }).first(),
    ).toBeVisible();
  });
});
