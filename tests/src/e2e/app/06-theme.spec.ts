import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_SETTINGS_DARK } from "../../helpers/seed/index.js";

test.describe("app / theme", () => {
  test.describe("seeded dark", () => {
    test.use({ seed: { settings: SEED_SETTINGS_DARK } });
    test("boots the app in dark mode", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", {
        timeout: 5_000,
      });
    });
  });
});
