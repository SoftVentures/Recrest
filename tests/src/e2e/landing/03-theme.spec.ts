import { expect, test } from "../../fixtures/landing.fixture.js";
import { LANDING_THEME_STORAGE_KEY } from "../../helpers/constants.js";

test.describe("landing / theme toggle", () => {
  test("starts light and flips to dark on click", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: /toggle theme|design umschalten/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test.describe("pre-seeded dark", () => {
    test.use({ uiTheme: "dark" });
    test("boots in dark mode without flicker", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });
  });

  test("theme is persisted in localStorage", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /toggle theme|design umschalten/i }).click();
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      LANDING_THEME_STORAGE_KEY,
    );
    expect(stored === "dark" || stored === "light").toBe(true);
  });
});
