/**
 * Storage-key constants for the frontend. Re-exports the canonical
 * definitions from `@recrest/shared/constants/storage-keys` so app code can
 * import everything storage-related from a single ergonomic alias.
 *
 * One exception: the anti-flash inline script in `index.html` references
 * `"recrest:theme"` and `"recrest:theme-follows-system"` as hard-coded
 * string literals, because it runs before any module loads. Those two
 * literals are intentionally duplicated there — if you rename
 * `StorageKey.THEME` or `StorageKey.THEME_FOLLOWS_SYSTEM`, update the
 * inline script too.
 */
export {
  CONFIRM_SKIP_PREFIX,
  LOGO_KEY_PREFIX,
  NOTIF_KEY_PREFIX,
  SCROLL_KEY_PREFIX,
  STORAGE_PREFIX,
  StorageKey,
  storageKeyForConfirmSkip,
  storageKeyForLogo,
  storageKeyForScroll,
  type StorageKeyName,
} from "@recrest/shared";
