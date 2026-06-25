import type { Page } from "@playwright/test";

import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

// Plan 05 (typography) — the web-verifiable surface. Pure-web (:3000) can drive
// the UI/code-font + ligature pickers and assert the resulting `:root` CSS vars
// and `html` dataset. The actual TTF upload is Tauri-only (the stub returns an
// empty list), so this spec only proves the upload affordance is gated off here.
const G = TEST_IDS.settings.general;

async function pickFromSelect(page: Page, selectId: string, optionId: string) {
  // MUI Select opens its (portalled) listbox when the combobox root is clicked.
  await page.getByTestId(selectId).click();
  await page.getByTestId(optionId).click();
}

function rootCssVar(page: Page, name: string) {
  return page.evaluate(
    (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
}

test.describe("app / typography (Plan 05)", () => {
  test("code-font switch drives --recrest-font-mono + html[data-code-font]", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await expect(page.getByTestId(TEST_IDS.settings.panel("general"))).toBeVisible();

    await pickFromSelect(page, G.codeFontSelect, G.codeFontOption("fira-code"));

    await expect(page.locator("html")).toHaveAttribute("data-code-font", "fira-code");
    expect(await rootCssVar(page, "--recrest-font-mono")).toContain("Fira");
  });

  test("ligature switch toggles standard / off via --recrest-code-ligatures", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);
    await expect(page.getByTestId(TEST_IDS.settings.panel("general"))).toBeVisible();

    // Default is "standard" (DEFAULT_LIGATURE_MODE) — the switch starts on.
    await expect(page.locator("html")).toHaveAttribute("data-code-ligatures", "standard");
    expect(await rootCssVar(page, "--recrest-code-ligatures")).toBe('"liga" 1, "calt" 1');

    // Toggle off.
    await page.getByTestId(G.codeLigaturesSwitch).click();
    await expect(page.locator("html")).toHaveAttribute("data-code-ligatures", "off");
    expect(await rootCssVar(page, "--recrest-code-ligatures")).toBe('"liga" 0, "calt" 0, "dlig" 0');

    // Toggle back on.
    await page.getByTestId(G.codeLigaturesSwitch).click();
    await expect(page.locator("html")).toHaveAttribute("data-code-ligatures", "standard");
    expect(await rootCssVar(page, "--recrest-code-ligatures")).toBe('"liga" 1, "calt" 1');
  });

  test("UI-font switch is independent of the code font", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);

    await pickFromSelect(page, G.codeFontSelect, G.codeFontOption("jetbrains-mono"));
    await pickFromSelect(page, G.fontSelect, G.fontOption("manrope"));

    await expect(page.locator("html")).toHaveAttribute("data-font", "manrope");
    // The code font must not move when the UI font changes.
    await expect(page.locator("html")).toHaveAttribute("data-code-font", "jetbrains-mono");
  });

  test("custom-font upload affordance renders, list starts empty", async ({ page }) => {
    await page.goto(AppRoute.SETTINGS);

    // The Playwright fixture fakes `window.__TAURI_INTERNALS__`, so `isTauri()`
    // is true here and the upload button is enabled. `list_custom_fonts`
    // returns [] from the stub, so no custom-font chips exist. The real file
    // pick + FontFace registration can't be driven from the web harness — that
    // lives on the manual Tauri checklist.
    await expect(page.getByTestId(G.customFontUpload)).toBeVisible();
    await expect(page.getByTestId(G.customFontUpload)).toBeEnabled();
    await expect(page.getByTestId(G.customFontChip("my-custom"))).toHaveCount(0);
    await page
      .getByTestId(TEST_IDS.settings.panel("general"))
      .screenshot({ path: "../.screenshots/plan05-appearance.png" });
  });
});
