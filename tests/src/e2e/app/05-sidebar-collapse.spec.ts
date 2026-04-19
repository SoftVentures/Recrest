import { expect, test } from "../../fixtures/app.fixture.js";
import { APP_UI_STORAGE_KEY } from "../../helpers/constants.js";

test.describe("app / sidebar collapse", () => {
  test("fold button toggles the collapsed class + persists to localStorage", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "app-mobile",
      "sidebar is already force-collapsed on mobile by useResponsiveSidebar",
    );
    await page.goto("/");
    const sidebar = page.getByRole("complementary", { name: /Primary/i });
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveClass(/collapsed/);

    await sidebar.locator(".a-side-fold").click();
    await expect(sidebar).toHaveClass(/collapsed/);

    // persistenceMiddleware writes ui.sidebarCollapsed into `recrest:ui`.
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      APP_UI_STORAGE_KEY,
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).sidebarCollapsed).toBe(true);
  });
});
