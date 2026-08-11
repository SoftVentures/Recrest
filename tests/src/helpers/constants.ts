/**
 * Shared test-wide constants. Nothing here depends on runtime state; keep
 * values stable across the suite so assertions can reference them directly.
 */
// `with { type: "json" }` is not optional: `tests/package.json` is
// `"type": "module"`, so Playwright loads this as real ESM and Node rejects a
// bare JSON import with "needs an import attribute of type: json".
import EN_COMMON from "../../../app/src/locales/en/common.json" with { type: "json" };

export const APP_URL = process.env.RECREST_APP_URL ?? "http://localhost:3000";
export const LANDING_URL = process.env.RECREST_LANDING_URL ?? "http://localhost:4321";

export const REPO_URL = "https://github.com/SoftVentures/Recrest";
export const RELEASES_LATEST_URL = `${REPO_URL}/releases/latest`;

/** Version pulled from the root package.json at build time on the landing page
 *  (`__APP_VERSION__`). We hard-code the expected value so a bump must update
 *  both sides consciously — drift between `package.json` and the rendered text
 *  becomes a failing test. */
export const EXPECTED_APP_VERSION = "0.10.2";

/** Mirrors `landingpage/src/components/DownloadButton.tsx::directDownloadUrl`.
 *  For a known OS the button links directly to the asset zip; only the
 *  `unknown`-UA case falls back to `RELEASES_LATEST_URL`. Kept here so specs
 *  assert against the real production contract instead of a stale alias. */
export function expectedDownloadUrl(os: "macos" | "windows" | "linux" | "unknown"): string {
  if (os === "unknown") return RELEASES_LATEST_URL;
  return `${RELEASES_LATEST_URL}/download/recrest-v${EXPECTED_APP_VERSION}-${os}.zip`;
}

export const LANDING_LOCALE_STORAGE_KEY = "recrest-landing-locale";
export const LANDING_THEME_STORAGE_KEY = "recrest-landing-theme";
export const APP_I18N_STORAGE_KEY = "i18nextLng";
export const APP_UI_STORAGE_KEY = "recrest:ui";

/** Name of the global the Tauri stub installs to log every dispatched command,
 *  in order. Specs read it to prove a command was *not* dispatched — a cancelled
 *  confirmation leaves no trace in the DOM, so there is nothing else to assert
 *  on. Lives here rather than inline in each spec per the no-magic-strings rule.
 *
 *  `tauri-stub.ts` interpolates this constant into its stringified
 *  `addInitScript` payload, so the name is written in exactly one place. */
export const STUB_CALLS_GLOBAL = "__RECREST_STUB_CALLS__";

/** Copy-independent state attribute on the provider status pill, mirroring
 *  `ProviderRow`'s `data-tone={statusTone}`. Values are the `StatusPillTone`
 *  union minus `self-hosted`: `connected` | `invalid` | `unreachable` |
 *  `disconnected`. Assert on this rather than on the rendered label whenever the
 *  spec cares about the STATE — a rewording must not fail a state test. */
export const PILL_TONE_ATTR = "data-tone";

/** Provider status-pill copy, read out of the app's EN bundle instead of being
 *  retyped in the spec. Hard-coded English (`/token rejected/i`) makes a pure
 *  copy edit fail three specs, which is the exact failure mode
 *  `22-i18n-runtime-keys.spec.ts` argues against: the translation KEY is the
 *  contract, the rendered string is not. Reading the bundle keeps the assertion
 *  on the key while still checking the user-visible text. Import path mirrors
 *  `helpers/test-ids.ts`, which already reaches into `app/src` for the same
 *  don't-duplicate-the-contract reason. */
export const PROVIDER_STATUS_COPY = {
  connected: EN_COMMON.settings.providers.status_connected,
  invalid: EN_COMMON.settings.providers.status_invalid,
  unreachable: EN_COMMON.settings.providers.status_unreachable,
  disconnected: EN_COMMON.settings.providers.status_disconnected,
} as const;
