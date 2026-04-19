import { test as base, expect } from "@playwright/test";

import { LANDING_LOCALE_STORAGE_KEY, LANDING_THEME_STORAGE_KEY } from "../helpers/constants.js";
import type { Locale } from "../helpers/selectors.js";

export type Theme = "light" | "dark";

/**
 * Pre-configures the landing page with a specific locale + theme **before**
 * navigation so there's no visible flash-of-english or flash-of-light.
 * Selecting a fixed UA lets the Download-button OS-detection specs cover
 * every platform branch deterministically.
 *
 * Fixture names are prefixed (`uiLocale`, `uiTheme`, `fakeUserAgent`) to dodge
 * collisions with Playwright's built-in `locale` and `userAgent` test options.
 */
type LandingOptions = {
  uiLocale: Locale;
  uiTheme: Theme;
  fakeUserAgent: string | undefined;
};

export const test = base.extend<LandingOptions>({
  uiLocale: ["en", { option: true }],
  uiTheme: ["light", { option: true }],
  fakeUserAgent: [undefined, { option: true }],
  page: async ({ page, uiLocale, uiTheme, fakeUserAgent }, use) => {
    if (fakeUserAgent) {
      await page.context().setExtraHTTPHeaders({ "user-agent": fakeUserAgent });
    }
    await page.addInitScript(
      ([localeKey, themeKey, l, t, ua]) => {
        try {
          window.localStorage.setItem(localeKey, l);
          window.localStorage.setItem(themeKey, t);
        } catch {
          // storage may be blocked in private contexts; harmless in Playwright.
        }
        if (ua) {
          Object.defineProperty(navigator, "userAgent", { get: () => ua, configurable: true });
        }
      },
      [
        LANDING_LOCALE_STORAGE_KEY,
        LANDING_THEME_STORAGE_KEY,
        uiLocale,
        uiTheme,
        fakeUserAgent ?? "",
      ] as const,
    );
    await use(page);
  },
});

export { expect };
