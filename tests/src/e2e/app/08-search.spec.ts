import { expect, test } from "../../fixtures/app.fixture.js";

test.describe("app / search overlay", () => {
  test("Ctrl+K opens the search overlay, Escape closes it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".app")).toBeVisible();

    const isMac = process.platform === "darwin";
    await page.keyboard.press(isMac ? "Meta+k" : "Control+k");

    const overlay = page
      .locator('[role="dialog"], [class*="SearchOverlay"], [class*="search-overlay"]')
      .first();
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(overlay).toBeHidden({ timeout: 5_000 });
  });
});
