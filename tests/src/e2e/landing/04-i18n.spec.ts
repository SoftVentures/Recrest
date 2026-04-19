import { expect, test } from "../../fixtures/landing.fixture.js";
import { LANDING_LOCALE_STORAGE_KEY } from "../../helpers/constants.js";
import { LANDING_COPY } from "../../helpers/selectors.js";

test.describe("landing / language switcher", () => {
  test("opens on click and exposes both options with aria-selected", async ({ page }) => {
    await page.goto("/");
    const trigger = page.locator(".lang-trigger");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const options = menu.getByRole("option");
    await expect(options).toHaveCount(2);

    // EN is the current (aria-selected=true) option in the en-seeded fixture.
    await expect(options.filter({ hasText: "English" })).toHaveAttribute("aria-selected", "true");
    await expect(options.filter({ hasText: "Deutsch" })).toHaveAttribute("aria-selected", "false");
  });

  test("selecting DE switches visible copy + persists locale", async ({ page }) => {
    await page.goto("/");
    await page.locator(".lang-trigger").click();
    await page.getByRole("option", { name: /Deutsch/ }).click();

    // Title line 1 changes to German.
    await expect(page.locator("h1.hero-title")).toContainText(LANDING_COPY.de.hero.titleLine1);
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      LANDING_LOCALE_STORAGE_KEY,
    );
    expect(stored).toBe("de");
  });

  test("Escape key closes the open menu", async ({ page }) => {
    await page.goto("/");
    const trigger = page.locator(".lang-trigger");
    await trigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
