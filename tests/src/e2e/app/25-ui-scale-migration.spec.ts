import { AppRoute, StorageKey } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { SEED_SETTINGS } from "../../helpers/seed/settings.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * The one-shot `fontSize` → `uiScale` migration, end to end.
 *
 * `fontSize` used to drive a CSS `zoom` on `#root` (lg = 1.12 → snapped to 1.1), so without the
 * migration every upgraded lg/xl user would boot into a visibly smaller UI.
 * The reducer unit tests pin the derivation; this pins the parts only the real
 * app can show: the scale actually reaches `--ui-scale`, it is written back to
 * the backend (otherwise the second launch would shrink), and a deliberate
 * return to 100 % is never undone.
 */
const UPGRADED = {
  settings: {
    ...SEED_SETTINGS,
    uiScale: 1,
    appearance: { ...SEED_SETTINGS.appearance, fontSize: "lg" as const },
  },
};

test.describe("app / ui scale migration", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");
  test.use({ uiLocale: "en", seed: UPGRADED });

  test("an upgraded lg user keeps their interface size, exactly once", async ({ page }) => {
    const probe = (markerKey: string) =>
      page.evaluate((key) => {
        const html = getComputedStyle(document.documentElement);
        return {
          uiScale: html.getPropertyValue("--ui-scale").trim(),
          fontSize: html.fontSize,
          marker: localStorage.getItem(key),
        };
      }, markerKey);
    const uiScale = async () => (await probe(StorageKey.UI_SCALE_MIGRATED)).uiScale;

    await page.goto(AppRoute.DASHBOARD);
    await expect.poll(uiScale).toBe("1.1");
    const first = await probe(StorageKey.UI_SCALE_MIGRATED);
    expect(first.fontSize).toBe("17.6px");
    expect(first.marker).toBe("true");

    // Survives a relaunch: only possible if the migrated scale reached the
    // backend, because the marker now blocks a second derivation.
    await page.reload();
    await expect.poll(uiScale).toBe("1.1");

    await page.goto(AppRoute.SETTINGS);
    const slider = page
      .getByTestId(TEST_IDS.settings.general.uiScaleSlider)
      .locator('input[type="range"]');
    await slider.focus();
    for (let i = 0; i < 10; i += 1) {
      if ((await slider.inputValue()) === "100") break;
      await slider.press("ArrowLeft");
    }
    await expect(slider).toHaveValue("100");
    await expect.poll(uiScale).toBe("1");

    // The regression this guards: the font size is still "lg", so a migration
    // that ran twice would bounce the user back to 1.1 here.
    await page.reload();
    await page.goto(AppRoute.DASHBOARD);
    await expect.poll(uiScale).toBe("1");
  });
});
