import type { Page } from "@playwright/test";

import { DEMO_VIEWPORT, DemoBridgeMessageType, DemoQueryParam } from "@recrest/shared";

import { expect, test } from "../../fixtures/landing.fixture.js";

/**
 * The hero embeds the **real web app** in an iframe (plan
 * `docs/plans/06-landingpage-live-demo.md`) — there is no hand-built DOM mock
 * left to assert against. Everything here therefore lives on the landingpage
 * side of the boundary: the frame, the click-to-interact overlay, and the
 * theme/locale contract from `shared/src/constants/demo.ts`. The demo's own
 * rendering is covered by the `app-*` projects; asserting into the iframe is
 * impossible anyway because it is served from a different origin.
 */

const BRIDGE_MESSAGES_GLOBAL = "__demoBridgeMessages";

interface BridgeMessage {
  type: string;
  value: string;
}

/**
 * Record what the landingpage posts into the demo iframe. The iframe is
 * cross-origin, so its `postMessage` cannot be patched directly — wrapping the
 * `contentWindow` getter (only for the demo frame) is the one seam that works
 * without changing production code.
 */
async function captureBridgeMessages(page: Page, globalName: string): Promise<void> {
  await page.addInitScript((name) => {
    const proto = HTMLIFrameElement.prototype;
    const getter = Object.getOwnPropertyDescriptor(proto, "contentWindow")?.get;
    if (!getter) return;
    const sink: unknown[] = [];
    (window as unknown as Record<string, unknown>)[name] = sink;
    Object.defineProperty(proto, "contentWindow", {
      configurable: true,
      get(this: HTMLIFrameElement) {
        const real = getter.call(this) as Window | null;
        if (!this.classList.contains("demo-live-frame")) return real;
        return {
          postMessage: (message: unknown, targetOrigin: string) => {
            sink.push(message);
            real?.postMessage(message, targetOrigin);
          },
        };
      },
    });
  }, globalName);
}

function readBridgeMessages(page: Page, globalName: string): Promise<BridgeMessage[]> {
  return page.evaluate(
    (name) => (window as unknown as Record<string, BridgeMessage[]>)[name] ?? [],
    globalName,
  );
}

async function demoSrcParams(page: Page): Promise<URLSearchParams> {
  const src = await page.locator("iframe.demo-live-frame").getAttribute("src");
  expect(src, "demo iframe has a src").toBeTruthy();
  return new URL(src!, page.url()).searchParams;
}

test.describe("landing / hero demo", () => {
  test("hero renders the live demo iframe at the virtual desktop size", async ({ page }) => {
    await page.goto("/");
    const frame = page.locator(".screenshot-frame.demo-frame");
    await expect(frame).toBeVisible();

    const iframe = frame.locator("iframe.demo-live-frame");
    await expect(iframe).toHaveAttribute("width", String(DEMO_VIEWPORT.width));
    await expect(iframe).toHaveAttribute("height", String(DEMO_VIEWPORT.height));

    // The frame renders at the fixed virtual desktop size and is CSS-scaled
    // down to the hero's width, so the embedded app never sees a tiny viewport.
    // `useDemoScale` measures via ResizeObserver, so poll rather than sample.
    // `clientWidth`, not the bounding rect: the hero's parallax transform on an
    // ancestor skews the rect, while the ResizeObserver reads layout width.
    const containerWidth = await page.locator(".demo-live").evaluate((el) => el.clientWidth);
    expect(containerWidth).toBeGreaterThan(0);
    await expect
      .poll(() => iframe.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a))
      .toBeCloseTo(containerWidth / DEMO_VIEWPORT.width, 2);

    // The titlebar's "open externally" link must point at the same build.
    const openHref = await frame.locator(".demo-titlebar-open").getAttribute("href");
    expect(openHref).toBe(await iframe.getAttribute("src"));
  });

  test("click-to-interact overlay guards the iframe until the visitor opts in", async ({
    page,
  }) => {
    await page.goto("/");
    const live = page.locator(".demo-live");
    const overlay = live.locator(".demo-live-overlay");
    const iframe = live.locator("iframe.demo-live-frame");

    await expect(overlay).toBeVisible();
    await expect(live).not.toHaveClass(/interactive/);
    // Page scroll must not get trapped inside the embedded app before opt-in.
    await expect(iframe).toHaveCSS("pointer-events", "none");

    await overlay.click();

    await expect(overlay).toHaveCount(0);
    await expect(live).toHaveClass(/interactive/);
    await expect(iframe).toHaveCSS("pointer-events", "auto");
  });

  test("initial theme + locale ride in on the demo URL query params", async ({ page }) => {
    await page.goto("/");
    const params = await demoSrcParams(page);
    expect(params.get(DemoQueryParam.THEME)).toBe("light");
    expect(params.get(DemoQueryParam.LOCALE)).toBe("en");
  });

  test.describe("pre-seeded dark + de", () => {
    test.use({ uiTheme: "dark", uiLocale: "de" });
    test("the demo URL mirrors the landingpage's seeded theme and locale", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const params = await demoSrcParams(page);
      expect(params.get(DemoQueryParam.THEME)).toBe("dark");
      expect(params.get(DemoQueryParam.LOCALE)).toBe("de");
    });
  });

  test("toggling the theme posts a set-theme message instead of reloading the iframe", async ({
    page,
  }) => {
    await captureBridgeMessages(page, BRIDGE_MESSAGES_GLOBAL);
    await page.goto("/");
    const iframe = page.locator("iframe.demo-live-frame");
    const srcBefore = await iframe.getAttribute("src");

    await page.getByRole("button", { name: /toggle theme|design umschalten/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await expect
      .poll(async () => {
        const messages = await readBridgeMessages(page, BRIDGE_MESSAGES_GLOBAL);
        return messages.filter(
          (m) => m.type === DemoBridgeMessageType.SET_THEME && m.value === "dark",
        ).length;
      })
      .toBeGreaterThan(0);

    // The bridge exists precisely so the demo keeps its state across toggles.
    await expect(iframe).toHaveAttribute("src", srcBefore!);
  });

  test("switching the language posts a set-locale message", async ({ page }) => {
    await captureBridgeMessages(page, BRIDGE_MESSAGES_GLOBAL);
    await page.goto("/");
    const iframe = page.locator("iframe.demo-live-frame");
    const srcBefore = await iframe.getAttribute("src");

    await page.locator(".lang-trigger").click();
    await page.getByRole("option", { name: /Deutsch/ }).click();

    await expect
      .poll(async () => {
        const messages = await readBridgeMessages(page, BRIDGE_MESSAGES_GLOBAL);
        return messages.filter(
          (m) => m.type === DemoBridgeMessageType.SET_LOCALE && m.value === "de",
        ).length;
      })
      .toBeGreaterThan(0);

    await expect(iframe).toHaveAttribute("src", srcBefore!);
  });

  test("hovering the demo frame does not cause a height-jump", async ({ page }) => {
    await page.goto("/");
    const frame = page.locator(".screenshot-frame.demo-frame");
    await expect(frame).toBeVisible();
    // Settle parallax / initial animations before measuring.
    await frame.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    const initialHeight = await frame.evaluate((el) => el.getBoundingClientRect().height);

    await frame.locator(".demo-live-overlay").hover();
    await page.waitForTimeout(250);
    const hoverHeight = await frame.evaluate((el) => el.getBoundingClientRect().height);

    // 4 px tolerance for sub-pixel + parallax jitter. The original bug was a
    // 24 px jump from a hover rule that has since been removed; 4 px is still
    // catch-any-real-regression territory but forgiving of the CSS parallax
    // transform that shifts the frame a few pixels on mouse move.
    expect(
      Math.abs(hoverHeight - initialHeight),
      `frame height jumped ${hoverHeight - initialHeight}px on hover`,
    ).toBeLessThanOrEqual(4);
  });
});
