import type { Page } from "@playwright/test";

import { expect, test } from "../../fixtures/landing.fixture.js";
import {
  DOWNLOAD_ROUTE_HASH,
  EXPECTED_AUR_COMMAND,
  EXPECTED_DOWNLOAD_ASSETS,
  expectedAssetUrl,
} from "../../helpers/constants.js";
import { LANDING_COPY } from "../../helpers/selectors.js";

/** Order `pages/Download.tsx::ALL_OS` renders the cards in. */
const CARD_ORDER = ["macos", "windows", "linux"] as const;
type CardOs = (typeof CARD_ORDER)[number];

/** `DownloadCard`'s `OS_LABEL` — product names, deliberately untranslated, so
 *  they are a stable handle for picking one card out of the grid. */
const OS_TITLE: Record<CardOs, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const HIGHLIGHTED_CLASS = "download-card--highlighted";

const CASES = [
  {
    name: "macOS",
    detected: "macos",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605 Safari/605",
  },
  {
    name: "Windows",
    detected: "windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537",
  },
  {
    name: "Linux",
    detected: "linux",
    ua: "Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537",
  },
  {
    name: "unknown",
    detected: null,
    ua: "Mozilla/5.0 (PlayStation 5) AppleWebKit/605",
  },
] as const;

function cardFor(page: Page, os: CardOs) {
  return page
    .locator(".download-card")
    .filter({ has: page.locator(".download-card__title", { hasText: OS_TITLE[os] }) });
}

for (const os of CASES) {
  test.describe(`landing / download — ${os.name} UA`, () => {
    test.use({ fakeUserAgent: os.ua });

    test("hero CTA opens the download page", async ({ page }) => {
      await page.goto("/");
      const cta = page.locator(".hero-cta a.btn.btn-primary").first();
      await expect(cta).toBeVisible();
      // The CTA is OS-agnostic by design: it no longer deep-links a release
      // asset per UA, it routes everyone to the page that also carries the
      // unsigned-build warning and the per-platform first-run steps.
      await expect(cta).toHaveText(LANDING_COPY.en.hero.downloadFallback);
      await expect(cta).toHaveAttribute("href", DOWNLOAD_ROUTE_HASH);

      await cta.click();
      await expect(page.locator(".download-card")).toHaveCount(CARD_ORDER.length);
    });

    test("OS detection highlights exactly the matching card", async ({ page }) => {
      await page.goto(`/${DOWNLOAD_ROUTE_HASH}`);
      await expect(page.locator(".download-card")).toHaveCount(CARD_ORDER.length);
      // `useOsDetect` seeds "unknown" and resolves in an effect, so the
      // highlight only lands after hydration. The unknown case asserts an
      // *absence*, which a not-yet-hydrated page would satisfy for the wrong
      // reason — settle the page first so it can't pass by being early.
      await page.waitForLoadState("networkidle");

      const highlighted = page.locator(`.${HIGHLIGHTED_CLASS}`);
      if (os.detected === null) {
        await expect(highlighted).toHaveCount(0);
        return;
      }

      await expect(highlighted).toHaveCount(1);
      await expect(cardFor(page, os.detected)).toHaveClass(new RegExp(HIGHLIGHTED_CLASS));
      await expect(highlighted.locator(".download-card__detected")).toHaveText(
        LANDING_COPY.en.download.detectedOs,
      );
    });
  });
}

test.describe("landing / download — release assets", () => {
  for (const os of CARD_ORDER) {
    test(`the ${os} card links the assets that actually exist on the release`, async ({ page }) => {
      await page.goto(`/${DOWNLOAD_ROUTE_HASH}`);
      // `a[download]` and not every anchor: the Linux card also carries an
      // external Flathub link, which is not a release asset.
      const links = cardFor(page, os).locator(".download-card__links a[download]");
      const expected = EXPECTED_DOWNLOAD_ASSETS[os];

      await expect(links).toHaveCount(expected.length);
      for (const [i, filename] of expected.entries()) {
        const link = links.nth(i);
        await expect(link).toHaveAttribute("href", expectedAssetUrl(filename));
        await expect(link).toHaveAttribute("download", "");
      }
    });
  }
});

test.describe("landing / download — package-manager channels", () => {
  test("the Linux card offers the AUR package as a command, not a download", async ({ page }) => {
    await page.goto(`/${DOWNLOAD_ROUTE_HASH}`);
    const card = cardFor(page, "linux");

    await expect(card.locator(".download-card__cmd-text")).toHaveText(EXPECTED_AUR_COMMAND);
    await expect(card.locator(".download-card__cmd-copy")).toHaveCount(1);
  });

  test("the Linux card links Flathub", async ({ page }) => {
    await page.goto(`/${DOWNLOAD_ROUTE_HASH}`);
    const flathub = cardFor(page, "linux").locator('a[href*="flathub.org"]');
    await expect(flathub).toHaveCount(1);
    await expect(flathub).toHaveAttribute("target", "_blank");
  });

  test("no card links an AppImage", async ({ page }) => {
    // Plan 11 dropped it; the release workflow no longer builds one, so any
    // surviving link is a guaranteed 404 for the visitor.
    await page.goto(`/${DOWNLOAD_ROUTE_HASH}`);
    await expect(page.locator('a[href$=".AppImage"]')).toHaveCount(0);
  });
});
