import type { Middleware } from "@reduxjs/toolkit";

import type { ActivityRange } from "@recrest/shared";

import { ACTIVITY_RANGE_ALL_KEY, ACTIVITY_RANGE_PRESETS } from "@/lib/constants/activity.constants";
import { StorageKey } from "@/lib/constants/storage.constants";
import { presetKeyFromRange, rangeFromPresetKey } from "@/lib/utils/activityRange.utils";
import { setSelectedRange } from "@/store/actions/activity.actions";
import type { RootState } from "@/store/rootState";

interface PersistedRange {
  /** Preset key (`7d`/…/`all`) the range matched when saved, or null for a
   *  custom (URL-injected) range. Drives how it's rehydrated. */
  key: string | null;
  since: string;
  until: string;
}

function isFixedPreset(key: string | null): boolean {
  return key != null && ACTIVITY_RANGE_PRESETS.some((p) => p.key === key);
}

/**
 * Read the persisted global range, recomputing relative presets against "now"
 * so e.g. "30d" always means the last 30 days on reopen (not a stale window).
 * `all` keeps its saved start (≈ oldest commit) but refreshes its end to now.
 * A custom range is restored verbatim. Returns null when nothing is stored or
 * the blob is unreadable — callers fall back to the default window.
 */
export function loadPersistedRange(): ActivityRange | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(StorageKey.ACTIVITY_RANGE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedRange;
    if (isFixedPreset(parsed.key)) return rangeFromPresetKey(parsed.key as string, null);
    if (parsed.key === ACTIVITY_RANGE_ALL_KEY) {
      return { since: parsed.since, until: new Date().toISOString() };
    }
    if (parsed.since && parsed.until) return { since: parsed.since, until: parsed.until };
    return null;
  } catch {
    return null;
  }
}

/** Persist the global range whenever it changes, so it survives an app
 *  restart. Stores the matched preset key alongside the absolute bounds. */
export const activityRangePersistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  if (setSelectedRange.match(action)) {
    if (typeof localStorage === "undefined") return result;
    const state = store.getState() as RootState;
    const range = state.activity.selectedRange;
    const blob: PersistedRange = {
      key: presetKeyFromRange(range, state.activity.oldestCommitDate),
      since: range.since,
      until: range.until,
    };
    try {
      localStorage.setItem(StorageKey.ACTIVITY_RANGE, JSON.stringify(blob));
    } catch {
      // Quota / private-mode failures are non-fatal — the range just won't persist.
    }
  }
  return result;
};
