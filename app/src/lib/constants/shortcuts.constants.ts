/**
 * Single source of truth for keyboard shortcuts. Both the binding hook
 * (`useGlobalShortcuts`) and the Settings → Shortcuts list iterate this same
 * registry, so the displayed combos can never drift from the real bindings.
 *
 * `combo.key` is stored lowercase for matching against `KeyboardEvent.key`;
 * the Settings list uppercases single letters purely for display.
 */

export const SHORTCUT_GROUP = {
  NAVIGATION: "navigation",
  ACTIONS: "actions",
} as const;
export type ShortcutGroup = (typeof SHORTCUT_GROUP)[keyof typeof SHORTCUT_GROUP];

export const SHORTCUT_ID = {
  NAV_DASHBOARD: "nav-dashboard",
  NAV_REPOS: "nav-repos",
  NAV_MERGE_REQUESTS: "nav-merge-requests",
  NAV_CHANGES: "nav-changes",
  NAV_BRANCHES: "nav-branches",
  NAV_ACTIVITY: "nav-activity",
  NAV_SETTINGS: "nav-settings",
  SEARCH: "search",
  TOGGLE_SIDEBAR: "toggle-sidebar",
  ZOOM_IN: "zoom-in",
  ZOOM_OUT: "zoom-out",
  ZOOM_RESET: "zoom-reset",
} as const;
export type ShortcutId = (typeof SHORTCUT_ID)[keyof typeof SHORTCUT_ID];

export interface ShortcutCombo {
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Lowercase `KeyboardEvent.key` to match (e.g. "k", "1", ","). */
  key: string;
  /**
   * Additional `KeyboardEvent.key` values that trigger the same action.
   * Only the zoom bindings need this: "+" sits on an unshifted key on
   * German layouts but is `Shift`+`=` on US ones, so a single `key` can
   * never cover both. Display and conflict detection deliberately ignore
   * `altKeys` — the primary `key` is the canonical binding.
   */
  altKeys?: string[];
  /**
   * Match regardless of the Shift state. Set for the zoom bindings for the
   * same layout reason as {@link altKeys}: on a US layout the user has to
   * hold Shift to produce "+" at all.
   */
  ignoreShift?: boolean;
}

export interface ShortcutDef {
  id: ShortcutId;
  combo: ShortcutCombo;
  /** i18n key (common namespace) for the human-readable label. */
  labelKey: string;
  group: ShortcutGroup;
}

/**
 * User overrides for the default combos, keyed by shortcut id. Only shortcuts
 * the user has rebound appear here; every other shortcut falls back to its
 * declarative default in `SHORTCUTS`. Persisted to `localStorage`
 * (`StorageKey.SHORTCUT_OVERRIDES`) and merged at bind/display time via
 * `resolveShortcuts` in `shortcuts.utils.ts`.
 */
export type ShortcutOverrides = Partial<Record<ShortcutId, ShortcutCombo>>;

export const SHORTCUTS: readonly ShortcutDef[] = [
  {
    id: SHORTCUT_ID.NAV_DASHBOARD,
    combo: { mod: true, key: "1" },
    labelKey: "settings.shortcuts.go_dashboard",
    group: SHORTCUT_GROUP.NAVIGATION,
  },
  {
    id: SHORTCUT_ID.NAV_REPOS,
    combo: { mod: true, key: "2" },
    labelKey: "settings.shortcuts.go_repos",
    group: SHORTCUT_GROUP.NAVIGATION,
  },
  {
    id: SHORTCUT_ID.NAV_MERGE_REQUESTS,
    combo: { mod: true, key: "3" },
    labelKey: "settings.shortcuts.go_merge_requests",
    group: SHORTCUT_GROUP.NAVIGATION,
  },
  {
    id: SHORTCUT_ID.NAV_CHANGES,
    combo: { mod: true, key: "4" },
    labelKey: "settings.shortcuts.go_changes",
    group: SHORTCUT_GROUP.NAVIGATION,
  },
  {
    id: SHORTCUT_ID.NAV_BRANCHES,
    combo: { mod: true, key: "5" },
    labelKey: "settings.shortcuts.go_branches",
    group: SHORTCUT_GROUP.NAVIGATION,
  },
  {
    id: SHORTCUT_ID.NAV_ACTIVITY,
    combo: { mod: true, key: "6" },
    labelKey: "settings.shortcuts.go_activity",
    group: SHORTCUT_GROUP.NAVIGATION,
  },
  {
    id: SHORTCUT_ID.NAV_SETTINGS,
    combo: { mod: true, key: "," },
    labelKey: "settings.shortcuts.go_settings",
    group: SHORTCUT_GROUP.NAVIGATION,
  },
  {
    id: SHORTCUT_ID.SEARCH,
    combo: { mod: true, key: "k" },
    labelKey: "settings.shortcuts.search",
    group: SHORTCUT_GROUP.ACTIONS,
  },
  {
    id: SHORTCUT_ID.TOGGLE_SIDEBAR,
    combo: { mod: true, key: "b" },
    labelKey: "settings.shortcuts.toggle_sidebar",
    group: SHORTCUT_GROUP.ACTIONS,
  },
  {
    id: SHORTCUT_ID.ZOOM_IN,
    combo: { mod: true, key: "+", altKeys: ["="], ignoreShift: true },
    labelKey: "settings.shortcuts.zoom_in",
    group: SHORTCUT_GROUP.ACTIONS,
  },
  {
    id: SHORTCUT_ID.ZOOM_OUT,
    combo: { mod: true, key: "-", altKeys: ["_"], ignoreShift: true },
    labelKey: "settings.shortcuts.zoom_out",
    group: SHORTCUT_GROUP.ACTIONS,
  },
  {
    id: SHORTCUT_ID.ZOOM_RESET,
    combo: { mod: true, key: "0" },
    labelKey: "settings.shortcuts.zoom_reset",
    group: SHORTCUT_GROUP.ACTIONS,
  },
];
