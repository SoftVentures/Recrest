import type { ShortcutOverrides } from "@/lib/constants/shortcuts.constants";

export interface ShortcutsState {
  /** User-rebound combos, keyed by shortcut id. Empty when every shortcut uses
   *  its default. Hydrated synchronously from `localStorage` at store creation
   *  and mirrored back by `shortcutsPersistMiddleware`. */
  overrides: ShortcutOverrides;
}
