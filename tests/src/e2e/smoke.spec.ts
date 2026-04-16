import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("app shell renders primary navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/repositories/i)).toBeVisible();
  });

  test("settings route loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
  });
});
