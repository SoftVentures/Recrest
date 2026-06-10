/**
 * `localStorage` key names. All keys are prefixed with `recrest:` so the
 * browser devtools storage panel groups them together and they don't collide
 * with anything else on the same origin (matters when running in a regular
 * browser via `yarn dev:web`).
 */
export const STORAGE_PREFIX = "recrest:";

export const StorageKey = {
  /** JSON blob of user-persisted UI state (`ui.sidebarCollapsed`, theme). */
  UI_STATE: `${STORAGE_PREFIX}ui`,
  /** Boolean flag set once the onboarding wizard is dismissed. */
  ONBOARDING_DISMISSED: `${STORAGE_PREFIX}onboarding-dismissed`,
  /** App version as last recorded on mount. Used by the developer "Reset
   *  last-seen version" affordance and (future) "What's new" dialog. */
  LAST_SEEN_VERSION: `${STORAGE_PREFIX}lastSeenVersion`,
  /** Active theme id ("light" | "dark" | "oled" | "glassy"). Mirrored on
   *  every render by `useThemeAttribute` so the anti-flash inline script in
   *  `index.html` can paint the correct surface on first frame. */
  THEME: `${STORAGE_PREFIX}theme`,
  /** "true" when the user has opted into "follow system" appearance.
   *  Read by `resolveBootTheme()` and the anti-flash script. */
  THEME_FOLLOWS_SYSTEM: `${STORAGE_PREFIX}theme-follows-system`,
  /** dev:web only: serialized AppSettings overlay so reloads persist user
   *  changes against the seed. Real Tauri uses `settings.json` on disk. */
  DEV_SETTINGS: `${STORAGE_PREFIX}dev-settings`,
  /** The global activity time-range selection (sidebar dropdown). Renderer-only
   *  UI preference, persisted here (not the backend) so it's available
   *  synchronously at store creation — no flash of the default window before an
   *  async backend load. Stored as `{ key, since, until }`; fixed presets are
   *  recomputed relative to "now" on load, so "30d" stays "last 30 days". */
  ACTIVITY_RANGE: `${STORAGE_PREFIX}activity-range`,
} as const;

/** Prefix for per-confirmation skip flags. Full key:
 *  `recrest:confirm-skip:<key>`. See `components/ui/confirm-dialog.tsx`. */
export const CONFIRM_SKIP_PREFIX = `${STORAGE_PREFIX}confirm-skip:`;

export function storageKeyForConfirmSkip(key: string): string {
  return `${CONFIRM_SKIP_PREFIX}${key}`;
}

/** Per-repo logo override (base64 data URL). Full key:
 *  `recrest:logo:<repoId>`. Used by `components/repos/RepoAvatar.tsx`. */
export const LOGO_KEY_PREFIX = `${STORAGE_PREFIX}logo:`;

export function storageKeyForLogo(repoId: string): string {
  return `${LOGO_KEY_PREFIX}${repoId}`;
}

/** Prefix for per-page scroll-position cache. `sessionStorage`, not
 *  `localStorage` — see `useScrollRestoration`. Full key:
 *  `recrest:scroll:<pageId>`. */
export const SCROLL_KEY_PREFIX = `${STORAGE_PREFIX}scroll:`;

export function storageKeyForScroll(pageId: string): string {
  return `${SCROLL_KEY_PREFIX}${pageId}`;
}

/** Prefix for notification baseline keys written by the in-app notifier.
 *  Used by `DeveloperTab` to wipe all `recrest:notif*` entries (no exact
 *  scheme — anything starting with this prefix is considered notification
 *  bookkeeping). */
export const NOTIF_KEY_PREFIX = `${STORAGE_PREFIX}notif`;

export type StorageKeyName = (typeof StorageKey)[keyof typeof StorageKey];
