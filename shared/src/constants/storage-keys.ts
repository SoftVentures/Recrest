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

export type StorageKeyName = (typeof StorageKey)[keyof typeof StorageKey];
