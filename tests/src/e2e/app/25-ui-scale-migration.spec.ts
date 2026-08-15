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

/**
 * The heaviest state the migration can produce: an `xl` user lands on
 * `uiScale 1.25` **and** keeps `--text-scale 17/13`, so their text renders
 * ~1.63× the design size while the chrome around it rides 1.25×. That
 * divergence is the whole point of splitting the two controls, and it is
 * exactly what the `fontPxToRem` / `pxToRem` containment policy has to
 * survive — a box sized with `pxToRem` holding text sized with
 * `fontPxToRem` is the pairing that clips if the policy is violated.
 */
test.describe("app / ui scale migration — densest pages at xl", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");
  test.use({
    uiLocale: "en",
    seed: {
      settings: {
        ...SEED_SETTINGS,
        uiScale: 1.25,
        appearance: { ...SEED_SETTINGS.appearance, fontSize: "xl" as const },
      },
    },
  });

  for (const route of [AppRoute.REPOS, AppRoute.MERGE_REQUESTS] as const) {
    test(`${route} keeps its chrome inside the viewport`, async ({ page }) => {
      await page.goto(route);
      await expect
        .poll(() =>
          page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue("--ui-scale").trim(),
          ),
        )
        .toBe("1.25");

      // Not `scrollWidth`: `html` and `body` are `overflow-x: hidden`, so an
      // over-wide layout is silently *cut off* rather than turned into a
      // scrollbar — measured, and it is why the original Wayland report read
      // "das Drumherum ist nicht zu sehen". The honest symptom is a testid'd
      // element whose box sits past the viewport edge.
      const escaped = await page.evaluate(() =>
        [...document.querySelectorAll("[data-testid]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
          })
          .map(
            (el) =>
              `${(el as HTMLElement).dataset.testid}@${Math.round(el.getBoundingClientRect().right)}`,
          ),
      );
      expect(escaped).toEqual([]);
    });
  }
});
