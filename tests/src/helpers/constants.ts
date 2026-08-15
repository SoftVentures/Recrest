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
 *  (`__APP_VERSION__`). Hard-coding the expected value is what makes the spec a
 *  real check: it asserts the build-time injection actually happened, rather
 *  than comparing package.json against itself.
 *
 *  Bumped by release-please via `extra-files` — the marker must stay on THIS
 *  line, because the Generic updater only rewrites the line it sits on. It used
 *  to be hand-maintained "so a bump is conscious", but `ci.yml::version-sync`
 *  now enforces that consciously enough, and the manual step reddened every
 *  release PR at the one moment nobody wants a red gate. */
export const EXPECTED_APP_VERSION = "0.11.0"; // x-release-please-version

/** Hash route of the landing page's download view (`useDownloadRoute`). The
 *  hero and nav CTAs both point at it instead of linking a release asset
 *  directly, so the OS/arch choice happens on a page that can explain the
 *  unsigned-build caveat. */
export const DOWNLOAD_ROUTE_HASH = "#/download";

/** The human-facing release assets, per OS, in the order the download cards
 *  render them. **Deliberately hard-coded rather than imported from
 *  `landingpage/src/lib/downloadUrl.ts`** — importing it would compare the
 *  landing page against itself and happily green-light a typo'd filename. These
 *  names are verified against a real GitHub release (`gh release view v0.11.0`);
 *  a mismatch means a visitor's Download button 404s.
 *
 *  Not to be confused with the `Recrest_<version>_*` assets on the same
 *  release: those are Tauri's updater payloads (consumed by `latest.json`), not
 *  something a human should click. */
export const EXPECTED_DOWNLOAD_ASSETS = {
  macos: [
    `recrest-v${EXPECTED_APP_VERSION}-mac-arm64.dmg`,
    `recrest-v${EXPECTED_APP_VERSION}-mac-x64.dmg`,
  ],
  windows: [
    `recrest-v${EXPECTED_APP_VERSION}-windows-x64.exe`,
    `recrest-v${EXPECTED_APP_VERSION}-windows-arm64.exe`,
  ],
  linux: [
    `recrest-v${EXPECTED_APP_VERSION}-linux-x64.AppImage`,
    `recrest-v${EXPECTED_APP_VERSION}-linux-x64.deb`,
    `recrest-v${EXPECTED_APP_VERSION}-linux-x64.rpm`,
  ],
} as const;

/** Mirrors `landingpage/src/lib/downloadUrl.ts::buildDownloadUrl`. */
export function expectedAssetUrl(filename: string): string {
  return `${RELEASES_LATEST_URL}/download/${filename}`;
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
