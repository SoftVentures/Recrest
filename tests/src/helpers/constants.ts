/**
 * Shared test-wide constants. Nothing here depends on runtime state; keep
 * values stable across the suite so assertions can reference them directly.
 */

export const APP_URL = process.env.RECREST_APP_URL ?? "http://localhost:3000";
export const LANDING_URL = process.env.RECREST_LANDING_URL ?? "http://localhost:4321";

export const REPO_URL = "https://github.com/SoftVentures/Recrest";
export const RELEASES_LATEST_URL = `${REPO_URL}/releases/latest`;

/** Version pulled from the root package.json at build time on the landing page
 *  (`__APP_VERSION__`). We hard-code the expected value so a bump must update
 *  both sides consciously — drift between `package.json` and the rendered text
 *  becomes a failing test. */
export const EXPECTED_APP_VERSION = "0.5.1";

export const LANDING_LOCALE_STORAGE_KEY = "recrest-landing-locale";
export const LANDING_THEME_STORAGE_KEY = "recrest-landing-theme";
export const APP_I18N_STORAGE_KEY = "i18nextLng";
export const APP_UI_STORAGE_KEY = "recrest:ui";
