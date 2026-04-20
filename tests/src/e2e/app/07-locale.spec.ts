import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { APP_COPY } from "../../helpers/selectors.js";

test.describe("app / locale", () => {
  test.describe("german boot", () => {
    test.use({ uiLocale: "de" });
    test("settings nav item renders German label", async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name === "app-mobile",
        "sidebar is collapsed on mobile — labels are hidden",
      );
      await page.goto(AppRoute.DASHBOARD);
      const settingsNav = page.getByTestId("nav-settings");
      await expect(settingsNav).toBeVisible();
      await expect(settingsNav).toContainText(new RegExp(APP_COPY.de.nav.settings, "i"));
    });
  });

  test("english boot renders English label", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "app-mobile",
      "sidebar is collapsed on mobile — labels are hidden",
    );
    await page.goto(AppRoute.DASHBOARD);
    const settingsNav = page.getByTestId("nav-settings");
    await expect(settingsNav).toBeVisible();
    await expect(settingsNav).toContainText(new RegExp(APP_COPY.en.nav.settings, "i"));
  });
});
