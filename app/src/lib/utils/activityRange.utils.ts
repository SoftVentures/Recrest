import type { ActivityRange } from "@recrest/shared";

import {
  ACTIVITY_RANGE_ALL_KEY,
  ACTIVITY_RANGE_DAY_MS,
  ACTIVITY_RANGE_PRESETS,
} from "@/lib/constants/activity.constants";

/**
 * Build an `ActivityRange` from a preset key. `all` resolves to
 * `[oldestDate, now]` and returns null when the oldest commit date isn't known
 * yet (so callers can keep the control disabled). An unknown key returns null.
 */
export function rangeFromPresetKey(key: string, oldestDate: string | null): ActivityRange | null {
  if (key === ACTIVITY_RANGE_ALL_KEY) {
    if (!oldestDate) return null;
    return { since: oldestDate, until: new Date().toISOString() };
  }
  const preset = ACTIVITY_RANGE_PRESETS.find((p) => p.key === key);
  if (!preset) return null;
  const now = Date.now();
  return {
    since: new Date(now - preset.days * ACTIVITY_RANGE_DAY_MS).toISOString(),
    until: new Date(now).toISOString(),
  };
}

/**
 * Derive which preset key a range corresponds to. A preset whose `days` matches
 * the window width within ±1 (clock/DST drift) wins first, so a young repo whose
 * oldest commit sits inside the 30d window still highlights "30d" rather than
 * "all". `all` is the fallback only for a range reaching back to the oldest
 * commit. A custom (URL-injected) range matches nothing → null.
 */
export function presetKeyFromRange(value: ActivityRange, oldestDate: string | null): string | null {
  const windowDays = Math.round(
    (Date.parse(value.until) - Date.parse(value.since)) / ACTIVITY_RANGE_DAY_MS,
  );
  const match = ACTIVITY_RANGE_PRESETS.find((preset) => Math.abs(preset.days - windowDays) <= 1);
  if (match) return match.key;
  if (oldestDate && value.since <= oldestDate) return ACTIVITY_RANGE_ALL_KEY;
  return null;
}
