import { expect, test } from "../../fixtures/app.fixture.js";
import { APP_UI_STORAGE_KEY } from "../../helpers/constants.js";

test.describe("app / sidebar collapse", () => {
  test("fold button toggles the collapsed state + persists to localStorage", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "app-mobile",
      "sidebar is already force-collapsed on mobile by useResponsiveSidebar",
    );
    await page.goto("/");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveAttribute("data-collapsed", "true");

    await page.getByTestId("sidebar-fold-btn").click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      APP_UI_STORAGE_KEY,
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).sidebarCollapsed).toBe(true);
  });
});
