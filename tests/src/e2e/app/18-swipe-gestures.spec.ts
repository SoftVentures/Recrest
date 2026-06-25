import { AppRoute } from "@recrest/shared";

import { expect, test } from "../../fixtures/app.fixture.js";

/**
 * D.5: swipe gestures.
 *
 * Two documented use-cases (mirrors `usePageSwipe.ts` doc comment):
 *  1. **Drawer dismiss** — right swipe on the MR drawer closes it without
 *     the user needing to reach the X / Escape.
 *  2. **Horizontal page switch** — left swipe on a top-level page (Activity)
 *     advances to the next page in the swipe ring (Repos).
 *
 * Both swipe hooks are bound through `@use-gesture/react` with
 * `pointer: { touch: true }`. In headless Chrome, `'ontouchstart' in window`
 * is `false`, so @use-gesture falls back to `PointerEvent`s — we therefore
 * dispatch `PointerEvent`s with `pointerType:"touch"`. Mouse pointers are
 * explicitly filtered out by both hooks (see `useDrawerSwipe.ts` lines 37-40),
 * so `page.mouse.move` would do nothing.
 *
 * Restricted to `app-desktop` because Chromium's desktop runtime exposes a
 * constructable `TouchEvent` regardless of `hasTouch`, so the touch-gesture
 * code path is exercised reliably there.
 */

async function dispatchSwipe(
  page: import("@playwright/test").Page,
  selector: string,
  delta: { dx: number; dy: number },
  steps = 8,
): Promise<void> {
  await page.evaluate(
    ({ selector, dx, dy, steps }) => {
      const target =
        selector === "body"
          ? document.body
          : (document.querySelector(selector) as HTMLElement | null);
      if (!target) throw new Error(`swipe target not found: ${selector}`);

      const rect = target.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      // @use-gesture detects touch via `'ontouchstart' in window`. Headless
      // Chrome reports `false`, so the lib falls back to PointerEvents — and
      // the hooks gate only on `pointerType === "mouse"`, which means we can
      // still drive the gesture by sending PointerEvents whose pointerType is
      // "touch". This keeps the test honest: we exercise the same code path
      // the real iOS/Android touch input would.
      const fire = (type: "pointerdown" | "pointermove" | "pointerup", x: number, y: number) => {
        const ev = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
        });
        target.dispatchEvent(ev);
      };

      fire("pointerdown", startX, startY);
      for (let i = 1; i <= steps; i++) {
        const x = startX + (dx * i) / steps;
        const y = startY + (dy * i) / steps;
        fire("pointermove", x, y);
      }
      fire("pointerup", startX + dx, startY + dy);
    },
    { selector, dx: delta.dx, dy: delta.dy, steps },
  );
}

test.describe("app / swipe gestures (D.5)", () => {
  // NB: the Merge Requests page no longer uses a swipe-dismissable overlay
  // drawer — it now opens the detail in a push pane (like Repositories) that
  // closes via its header button, so there is no MR-drawer swipe case here.

  test("use-case 2: left swipe on Activity page navigates to Repos", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "app-desktop",
      "TouchEvent constructor is most reliable on app-desktop",
    );
    await page.goto(AppRoute.ACTIVITY);
    // Escape so a route path containing regex metacharacters (e.g. ".") can't
    // accidentally over-match. Current routes are plain `/segment` strings but
    // the guard is cheap.
    const re = (path: string) => new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
    await expect(page).toHaveURL(re(AppRoute.ACTIVITY));

    await dispatchSwipe(page, "body", { dx: -240, dy: 0 });

    await expect(page).toHaveURL(re(AppRoute.REPOS), { timeout: 5_000 });
  });
});
