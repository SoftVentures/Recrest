import { test as base, expect } from "@playwright/test";

import { StorageKey } from "@recrest/shared";

import { APP_I18N_STORAGE_KEY } from "../helpers/constants.js";
import { type AppSeed, DEFAULT_SEED, resolveSeed } from "../helpers/seed/index.js";
import type { Locale } from "../helpers/selectors.js";
import { buildTauriStub } from "../helpers/tauri-stub.js";

/**
 * App fixture — installs the Tauri-IPC stub + seed data before any navigation.
 * The app boots as if running inside Tauri; all thunks resolve against the seed.
 *
 * Fixture names are prefixed (`seed`, `uiLocale`) to dodge collisions with
 * Playwright's built-in `locale` test option.
 */
type AppOptions = {
  seed: AppSeed;
  uiLocale: Locale;
};

export const test = base.extend<AppOptions>({
  seed: [DEFAULT_SEED, { option: true }],
  uiLocale: ["en", { option: true }],
  page: async ({ page, seed, uiLocale }, use) => {
    const resolved = resolveSeed(seed);
    await page.addInitScript({ content: buildTauriStub(resolved) });
    await page.addInitScript(
      ([localeKey, locale, onboardingKey, uiStateKey, theme]) => {
        try {
          window.localStorage.setItem(localeKey, locale);
          // Skip the first-run wizard — it would cover every test assertion.
          window.localStorage.setItem(onboardingKey, "true");
          // `persistenceMiddleware` only *writes*; the initial theme comes
          // from `loadPersisted()` on boot. Pre-seed it so useThemeEffect
          // applies the theme immediately, without waiting for loadSettings
          // (which only fires when the user opens Settings).
          const existing = window.localStorage.getItem(uiStateKey);
          const parsed = existing ? JSON.parse(existing) : {};
          window.localStorage.setItem(
            uiStateKey,
            JSON.stringify({ ...parsed, theme: theme || "system" }),
          );
        } catch {
          // ignore
        }
      },
      [
        APP_I18N_STORAGE_KEY,
        uiLocale,
        StorageKey.ONBOARDING_DISMISSED,
        StorageKey.UI_STATE,
        resolved.settings.theme,
      ] as const,
    );
    await use(page);
  },
});

export { expect };
