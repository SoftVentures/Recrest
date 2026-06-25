import type { Middleware } from "@reduxjs/toolkit";

import {
  SHORTCUT_ID,
  type ShortcutCombo,
  type ShortcutId,
  type ShortcutOverrides,
} from "@/lib/constants/shortcuts.constants";
import { StorageKey } from "@/lib/constants/storage.constants";
import {
  resetAllShortcuts,
  resetShortcut,
  setShortcutOverride,
} from "@/store/actions/shortcuts.actions";
import type { RootState } from "@/store/rootState";

const KNOWN_IDS = new Set<string>(Object.values(SHORTCUT_ID));

function isValidCombo(value: unknown): value is ShortcutCombo {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return typeof c.key === "string" && c.key.length > 0;
}

/**
 * Read the persisted shortcut overrides, dropping any entry whose id is no
 * longer a known shortcut or whose combo is malformed (e.g. a stale blob from
 * an older build that renamed an id). Returns an empty map when nothing is
 * stored or the blob is unreadable — callers then fall back to the defaults.
 */
export function loadPersistedOverrides(): ShortcutOverrides {
  if (typeof localStorage === "undefined") return {};
  const raw = localStorage.getItem(StorageKey.SHORTCUT_OVERRIDES);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: ShortcutOverrides = {};
    for (const [id, combo] of Object.entries(parsed)) {
      if (KNOWN_IDS.has(id) && isValidCombo(combo)) {
        clean[id as ShortcutId] = {
          mod: !!combo.mod,
          shift: !!combo.shift,
          alt: !!combo.alt,
          key: combo.key.toLowerCase(),
        };
      }
    }
    return clean;
  } catch {
    return {};
  }
}

/** Persist the override map whenever it changes, so custom bindings survive an
 *  app restart. Writes the whole map (not a diff) on every mutating action. */
export const shortcutsPersistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  if (
    setShortcutOverride.match(action) ||
    resetShortcut.match(action) ||
    resetAllShortcuts.match(action)
  ) {
    if (typeof localStorage === "undefined") return result;
    const overrides = (store.getState() as RootState).shortcuts.overrides;
    try {
      localStorage.setItem(StorageKey.SHORTCUT_OVERRIDES, JSON.stringify(overrides));
    } catch {
      // Quota / private-mode failures are non-fatal — the override just won't persist.
    }
  }
  return result;
};
