/**
 * Locale-related user preferences — date/time rendering, week-start, and an
 * optional region override for `Intl.DateTimeFormat` / `Intl.NumberFormat`.
 *
 * Persisted under `appearance.localePrefs` on the backend so any Recrest
 * surface (app + future web preview) reads them from a single source of
 * truth.
 */

export const DateFormat = {
  /** "2 hours ago" / "vor 2 Stunden" — `timeAgo`-style buckets. */
  RELATIVE: "relative",
  /** "Jun 18, 2026, 14:32" — locale-aware `Intl.DateTimeFormat`. */
  ABSOLUTE: "absolute",
} as const;
export type DateFormat = (typeof DateFormat)[keyof typeof DateFormat];

export const TimeFormat = {
  TWELVE_HOUR: "12h",
  TWENTY_FOUR_HOUR: "24h",
} as const;
export type TimeFormat = (typeof TimeFormat)[keyof typeof TimeFormat];

export const WeekStart = {
  MONDAY: "monday",
  SUNDAY: "sunday",
} as const;
export type WeekStart = (typeof WeekStart)[keyof typeof WeekStart];

/** BCP-47-style 2-letter region overrides offered in the picker. The
 *  sentinel `null` means "follow the language" (no region suffix). */
export interface RegionOption {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** i18n key under `settings.regions.*` for the display label. */
  labelKey: string;
  /** Languages this region is offered under; controls picker filtering. */
  languages: readonly string[];
}

export const REGIONS: readonly RegionOption[] = [
  { code: "US", labelKey: "settings.regions.US", languages: ["en"] },
  { code: "GB", labelKey: "settings.regions.GB", languages: ["en"] },
  { code: "CA", labelKey: "settings.regions.CA", languages: ["en"] },
  { code: "AU", labelKey: "settings.regions.AU", languages: ["en"] },
  { code: "IE", labelKey: "settings.regions.IE", languages: ["en"] },
  { code: "DE", labelKey: "settings.regions.DE", languages: ["de"] },
  { code: "AT", labelKey: "settings.regions.AT", languages: ["de"] },
  { code: "CH", labelKey: "settings.regions.CH", languages: ["de"] },
];

export interface LocaleSettings {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStart: WeekStart;
  /** `null` => follow the active language (no region suffix on the BCP-47 tag). */
  region: string | null;
}

export const DEFAULT_LOCALE_SETTINGS: LocaleSettings = {
  dateFormat: DateFormat.RELATIVE,
  timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
  weekStart: WeekStart.MONDAY,
  region: null,
};
