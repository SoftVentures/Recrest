import type { Page } from "@playwright/test";

import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";
import { TEST_IDS } from "../../helpers/test-ids";

/**
 * Guards the rem-scaling contract. Each assertion here replaces a defect the
 * old CSS-`zoom` implementation shipped with:
 *
 *  - `zoom` detached the layout viewport, so `#root` measured 1152 px inside a
 *    1440 px window and every breakpoint was blind.
 *  - Overlays portal to `document.body`, outside the zoomed `#root`, so they
 *    never scaled with the rest of the UI.
 *  - `uiScale` was persisted but had no renderer consumer at all.
 */
const G = TEST_IDS.settings.general;

async function openSettings(page: Page) {
  await page.goto(AppRoute.SETTINGS);
  await expect(page.getByTestId(TEST_IDS.settings.panel("general"))).toBeVisible();
}

async function setUiScale(page: Page, percent: number) {
  await openSettings(page);
  const input = page.getByTestId(G.uiScaleSlider).locator('input[type="range"]');
  await input.focus();
  const current = Number(await input.inputValue());
  const steps = Math.round((percent - current) / 5);
  for (let i = 0; i < Math.abs(steps); i += 1) {
    await input.press(steps > 0 ? "ArrowRight" : "ArrowLeft");
  }
  await expect(input).toHaveValue(String(percent));
}

/** After a navigation the app re-hydrates settings from the backend, so the
 *  scale lands one async tick late. Wait for it rather than sampling a boot
 *  frame. */
async function waitForScale(page: Page, expected: string) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--ui-scale").trim(),
      ),
    )
    .toBe(expected);
}

function readRootMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.getElementById("root");
    const html = document.documentElement;
    return {
      uiScale: getComputedStyle(html).getPropertyValue("--ui-scale").trim(),
      htmlFontSize: getComputedStyle(html).fontSize,
      zoom: root ? getComputedStyle(root).zoom : null,
      rootWidth: root ? root.getBoundingClientRect().width : null,
      innerWidth: window.innerWidth,
    };
  });
}

test.describe("app / ui scale", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "chromium only");
  test.use({ uiLocale: "en" });

  test("scale drives the root font size, never a zoom or a shrunken layout", async ({ page }) => {
    await setUiScale(page, 100);
    await page.goto(AppRoute.DASHBOARD);
    await waitForScale(page, "1");
    const base = await readRootMetrics(page);
    expect(base.htmlFontSize).toBe("16px");
    expect(base.rootWidth).toBe(base.innerWidth);

    await setUiScale(page, 125);
    await page.goto(AppRoute.DASHBOARD);
    await waitForScale(page, "1.25");
    const scaled = await readRootMetrics(page);
    expect(scaled.uiScale).toBe("1.25");
    expect(scaled.htmlFontSize).toBe("20px");
    // The layout viewport must stay honest: no `zoom`, no counter-sized #root.
    expect(scaled.zoom).not.toBe("1.25");
    expect(scaled.rootWidth).toBe(scaled.innerWidth);
  });

  test("breakpoints follow the effective design width", async ({ page }) => {
    await setUiScale(page, 100);
    await page.goto(AppRoute.DASHBOARD);
    await waitForScale(page, "1");
    const wide = await page
      .getByTestId(TEST_IDS.sidebar.root)
      .evaluate((el) => el.getBoundingClientRect().width);

    // 1440 real px at 1.25 leaves 1152 design px — below the 1200-px compact
    // threshold, so the sidebar has to collapse. Under `zoom` it never did.
    await setUiScale(page, 125);
    await page.goto(AppRoute.DASHBOARD);
    await waitForScale(page, "1.25");
    const compact = await page
      .getByTestId(TEST_IDS.sidebar.root)
      .evaluate((el) => el.getBoundingClientRect().width);

    expect(compact).toBeLessThan(wide / 2);
  });

  test("body-portalled overlays scale with the interface", async ({ page }) => {
    const measureOption = async () => {
      await openSettings(page);
      await page.getByTestId(G.fontSizeSelect).click();
      const measured = await page.evaluate(() => {
        const el = document.querySelector('[role="listbox"] [role="option"]');
        if (!(el instanceof HTMLElement)) return null;
        const cs = getComputedStyle(el);
        return {
          fontSize: parseFloat(cs.fontSize),
          paddingLeft: parseFloat(cs.paddingLeft),
          insideRoot: !!document.getElementById("root")?.contains(el),
        };
      });
      await page.keyboard.press("Escape");
      return measured;
    };

    await setUiScale(page, 100);
    const base = await measureOption();
    await setUiScale(page, 125);
    const scaled = await measureOption();

    expect(base?.insideRoot).toBe(false);
    expect(scaled?.fontSize).toBeCloseTo((base?.fontSize ?? 0) * 1.25, 2);
    expect(scaled?.paddingLeft).toBeCloseTo((base?.paddingLeft ?? 0) * 1.25, 2);
  });

  test("the widest modal stays inside the viewport at the maximum scale", async ({ page }) => {
    // AddRepoModal asks for 1200 design px, which is 1800 real px at scale 1.5
    // — wider than the 1440-px window. Before the viewport ceilings on the
    // dialog paper the surplus was simply clipped by `overflow: hidden`, taking
    // the confirm action with it, and the `fontSize: xl` → `uiScale` migration
    // dropped upgraded users straight into that state.
    await setUiScale(page, 150);
    await page.goto(AppRoute.REPOS);
    await waitForScale(page, "1.5");

    await page.getByTestId(TEST_IDS.header.btnAddRepo).click();
    const dialog = page.getByTestId(TEST_IDS.addRepoDialog.root);
    await expect(dialog).toBeVisible();

    const box = await dialog.locator(".MuiDialog-paper").evaluate((el) => {
      const inner = el.firstElementChild?.getBoundingClientRect();
      const paper = el.getBoundingClientRect();
      return {
        left: inner?.left ?? paper.left,
        right: inner?.right ?? paper.right,
        bottom: paper.bottom,
        top: paper.top,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.viewportWidth);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(box.viewportHeight);

    // The action row sits on the modal's right edge — the half the clip ate.
    await page.getByTestId(TEST_IDS.addRepoDialog.tab.local).click();
    await expect(page.getByTestId(TEST_IDS.addRepoDialog.submit)).toBeInViewport();
  });

  test("zoom hotkeys move the same setting the slider does", async ({ page }) => {
    await setUiScale(page, 100);
    await page.goto(AppRoute.DASHBOARD);
    await expect(page.getByTestId(TEST_IDS.header.root)).toBeVisible();
    await waitForScale(page, "1");
    const scale = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--ui-scale").trim(),
      );

    // One press at a time: the binding is a single window listener, so a
    // second keydown fired inside the same tick can land before React has
    // committed the first one.
    await page.keyboard.press("Control+=");
    await expect.poll(scale).toBe("1.05");
    await page.keyboard.press("Control+=");
    await expect.poll(scale).toBe("1.1");

    await page.keyboard.press("Control+-");
    await expect.poll(scale).toBe("1.05");

    await page.keyboard.press("Control+0");
    await expect.poll(scale).toBe("1");

    await openSettings(page);
    await expect(page.getByTestId(G.uiScaleSlider).locator('input[type="range"]')).toHaveValue(
      "100",
    );
  });
});
