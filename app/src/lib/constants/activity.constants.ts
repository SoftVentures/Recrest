/** URL search params mirroring `activity.selectedRange` (Plan 04/01 §C.2). */
export const ACTIVITY_URL_PARAM_SINCE = "since";
export const ACTIVITY_URL_PARAM_UNTIL = "until";

/** One day in milliseconds — basis for every range/window calculation. */
export const ACTIVITY_RANGE_DAY_MS = 86_400_000;

/** The "everything since the oldest commit" range key (not a fixed window). */
export const ACTIVITY_RANGE_ALL_KEY = "all";

export interface ActivityRangePreset {
  /** Stable key — also the i18n suffix (`activity.range.preset_<key>`). */
  key: string;
  days: number;
}

/**
 * Fixed-window presets backing the sidebar `RangeSelect` dropdown. `all` is
 * appended by the consumer because it needs the oldest-commit date rather than
 * a fixed day count.
 */
export const ACTIVITY_RANGE_PRESETS: readonly ActivityRangePreset[] = [
  { key: "7d", days: 7 },
  { key: "14d", days: 14 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "1y", days: 365 },
];

/**
 * Which repos feed the Activity aggregations: every scanned repo (`all`) or
 * only those backed by a connected remote provider (`remote`). Drives the
 * `ActivitySourceToggle` in the Activity header.
 */
export const ActivitySource = {
  ALL: "all",
  REMOTE: "remote",
} as const;

export type ActivitySource = (typeof ActivitySource)[keyof typeof ActivitySource];
