import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

test.describe("app / visual tour", () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== "app-desktop", "desktop visual tour only");
  });

  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }`,
    });
  });

  async function capture(page: import("@playwright/test").Page, label: string): Promise<void> {
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `../.screenshots/playwright/visual-tour/${label}.png`,
      fullPage: true,
    });
  }

  test("dashboard", async ({ page }) => {
    await page.goto(AppRoute.DASHBOARD);
    await expect(page.getByTestId(TEST_IDS.appMain)).toBeVisible();
    await capture(page, "01-dashboard");
  });

  test("repos — grouped view", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    await page.getByTestId(TEST_IDS.repos.viewToggle.grouped).click();
    await expect(page.getByTestId(TEST_IDS.repos.page)).toBeVisible();
    await capture(page, "02-repos-grouped");
  });

  test("repos — flat view", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    await page.getByTestId("repo-view-toggle-flat").click();
    await expect(page.getByTestId(TEST_IDS.repos.page)).toBeVisible();
    await capture(page, "03-repos-flat");
  });

  test("repos — card view", async ({ page }) => {
    await page.goto(AppRoute.REPOS);
    await page.getByTestId(TEST_IDS.repos.viewToggle.card).click();
    await expect(page.getByTestId(TEST_IDS.repos.page)).toBeVisible();
    await capture(page, "04-repos-card");
  });

  test("changes", async ({ page }) => {
    await page.goto(AppRoute.CHANGES);
    await expect(page.getByTestId(TEST_IDS.changes.page)).toBeVisible();
    await capture(page, "05-changes");
  });

  test("merge requests", async ({ page }) => {
    await page.goto(AppRoute.MERGE_REQUESTS);
    await expect(page.getByTestId(TEST_IDS.appMain)).toBeVisible();
    await capture(page, "06-merge-requests");
  });

  test("branches", async ({ page }) => {
    await page.goto(AppRoute.BRANCHES);
    await expect(page.getByTestId(TEST_IDS.appMain)).toBeVisible();
    await capture(page, "07-branches");
  });

  test("activity", async ({ page }) => {
    await page.goto(AppRoute.ACTIVITY);
    await expect(page.getByTestId(TEST_IDS.appMain)).toBeVisible();
    await capture(page, "08-activity");
  });

  test("settings — general", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("general")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("general"))).toBeVisible();
    await capture(page, "09-settings-general");
  });

  test("settings — accounts", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("accounts")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("accounts"))).toBeVisible();
    await capture(page, "10-settings-accounts");
  });

  test("settings — integrations", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("integrations")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("integrations"))).toBeVisible();
    await capture(page, "11-settings-integrations");
  });

  test("settings — shortcuts", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("shortcuts")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("shortcuts"))).toBeVisible();
    await capture(page, "12-settings-shortcuts");
  });

  test("settings — about", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await page.getByTestId(TEST_IDS.settings.tab("about")).click();
    await expect(page.getByTestId(TEST_IDS.settings.panel("about"))).toBeVisible();
    await capture(page, "13-settings-about");
  });

  test("dashboard — dark theme", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("recrest:ui", JSON.stringify({ theme: "dark" }));
    });
    await page.goto(AppRoute.DASHBOARD);
    await expect(page.getByTestId(TEST_IDS.appMain)).toBeVisible();
    await capture(page, "14-dashboard-dark");
  });
});
