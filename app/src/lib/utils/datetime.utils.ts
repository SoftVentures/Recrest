/**
 * Locale + preference-aware date/time formatting.
 *
 * Reads four user preferences off Redux (`settings.localePrefs`) plus the
 * active i18next language to build the right `Intl.DateTimeFormat` locale:
 *
 *   resolvedLocale = `${language}${region ? `-${region}` : ""}`
 *
 * Components consume this through the `useDateTimeFormat` hook (re-renders
 * on preference change). Pure helpers are exported alongside for unit tests
 * and non-component call sites.
 */
import { useMemo } from "react";

import {
  DEFAULT_LOCALE_SETTINGS,
  DateFormat,
  type LocaleSettings,
  TimeFormat,
} from "@recrest/shared";

import { useAppSelector } from "@/store/hooks";

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  return new Date(input);
}

/** BCP-47 locale tag built from language + optional region override. */
export function resolveLocale(language: string, region: string | null | undefined): string {
  const base = (language || "en").split("-")[0] ?? "en";
  if (!region) return base;
  return `${base}-${region}`;
}

/** Locale-aware relative time ("2 hours ago" / "vor 2 Stunden" / "in 3 days"),
 *  bucketed to seconds / minutes / hours / days via `Intl.RelativeTimeFormat`
 *  so it follows the active language + region. `numeric: "auto"` yields nicer
 *  phrasings ("now"/"jetzt", "yesterday"/"gestern") where the locale has them. */
export function formatRelative(input: DateInput, locale: string = "en"): string {
  const ts = toDate(input).getTime();
  if (Number.isNaN(ts)) return "—";
  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(locale || "en", { numeric: "auto" });
  } catch {
    rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  }
  // Negative = past, positive = future.
  const sec = Math.round((ts - Date.now()) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
  return rtf.format(Math.round(sec / 86400), "day");
}

/** Intl options for the date portion of each concrete (non-relative) preset. */
function datePortionOptions(dateFormat: DateFormat): Intl.DateTimeFormatOptions {
  switch (dateFormat) {
    case DateFormat.NUMERIC:
      return { year: "numeric", month: "2-digit", day: "2-digit" };
    case DateFormat.FULL:
      return { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    case DateFormat.MEDIUM:
    default:
      return { year: "numeric", month: "short", day: "numeric" };
  }
}

export interface AbsoluteFormatOptions {
  locale: string;
  timeFormat: TimeFormat;
  /** Include the time component (default true). */
  withTime?: boolean;
  /** IANA zone (`"Europe/Berlin"`); `null`/undefined => host system zone. */
  timeZone?: string | null;
  /** Which concrete date preset to render. Defaults to `MEDIUM`. `RELATIVE`
   *  is not valid here — use `formatTimestamp` for the preference-aware path. */
  dateFormat?: DateFormat;
}

/** Absolute date+time string respecting the 12h/24h preference, the chosen
 *  concrete date preset, and the optional time zone. */
export function formatAbsolute(input: DateInput, opts: AbsoluteFormatOptions): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "—";
  const withTime = opts.withTime !== false;
  const tz = opts.timeZone ?? undefined;
  const dateFormat = opts.dateFormat ?? DateFormat.MEDIUM;

  // ISO 8601 is locale-independent — `sv-SE` reliably yields YYYY-MM-DD; the
  // time portion is appended via the 12h/24h-aware time formatter.
  if (dateFormat === DateFormat.ISO) {
    const isoDate = new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: tz,
    }).format(d);
    if (!withTime) return isoDate;
    return `${isoDate} ${formatTimeOnly(d, { locale: opts.locale, timeFormat: opts.timeFormat, timeZone: tz })}`;
  }

  return new Intl.DateTimeFormat(opts.locale, {
    ...datePortionOptions(dateFormat),
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: opts.timeFormat === TimeFormat.TWELVE_HOUR,
        }
      : {}),
    timeZone: tz,
  }).format(d);
}

/** Time-only string respecting the 12h/24h preference and optional time zone. */
export function formatTimeOnly(
  input: DateInput,
  opts: { locale: string; timeFormat: TimeFormat; timeZone?: string | null },
): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(opts.locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: opts.timeFormat === TimeFormat.TWELVE_HOUR,
    timeZone: opts.timeZone ?? undefined,
  }).format(d);
}

/** Date-only strings (`YYYY-MM-DD`) are calendar dates, not instants — read
 *  them as LOCAL midnight; full ISO timestamps pass through unchanged. */
function parseCalendarDate(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
}

/** Locale-aware (region-aware) date range — "May 28 – Jun 8, 2026" /
 *  "28. Mai – 8. Juni 2026". Shared year collapses onto the end; a same-day
 *  range renders as one date. No time zone: these are calendar dates, so a
 *  zone shift would wrongly move the day. */
export function formatRange(startIso: string, endIso: string, locale: string): string {
  const start = parseCalendarDate(startIso);
  const end = parseCalendarDate(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startIso} – ${endIso}`;
  }
  const full: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  if (start.getTime() === end.getTime()) return start.toLocaleDateString(locale, full);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : full;
  return `${start.toLocaleDateString(locale, startOpts)} – ${end.toLocaleDateString(locale, full)}`;
}

export interface TimestampFormatOptions {
  locale: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timeZone?: string | null;
}

/** Honours the dateFormat preference: `relative` renders as `formatRelative`;
 *  every other (concrete) preset renders as `formatAbsolute`. */
export function formatTimestamp(input: DateInput, opts: TimestampFormatOptions): string {
  if (opts.dateFormat === DateFormat.RELATIVE) {
    return formatRelative(input, opts.locale);
  }
  return formatAbsolute(input, {
    locale: opts.locale,
    timeFormat: opts.timeFormat,
    timeZone: opts.timeZone,
    dateFormat: opts.dateFormat,
  });
}

/* ------------------------------------------------------------------------- *
 * React hooks
 * ------------------------------------------------------------------------- */

/** The user's locale-rendering preferences, with defaults filled in. */
export function useLocalePrefs(): LocaleSettings {
  return useAppSelector((s) => s.settings.localePrefs) ?? DEFAULT_LOCALE_SETTINGS;
}

/** Active i18next language slot from the store (mirrored by i18next's own
 *  detector). Falls back to "en". */
export function useLanguage(): string {
  return useAppSelector((s) => s.settings.locale) || "en";
}

/** BCP-47 locale tag derived from language + region preference. */
export function useResolvedLocale(): string {
  const language = useLanguage();
  const { region } = useLocalePrefs();
  return useMemo(() => resolveLocale(language, region), [language, region]);
}

/** Returns a stable bag of format helpers bound to the current preferences. */
export function useDateTimeFormat() {
  const language = useLanguage();
  const prefs = useLocalePrefs();
  const locale = useMemo(() => resolveLocale(language, prefs.region), [language, prefs.region]);
  const timeZone = prefs.timeZone;

  return useMemo(
    () => ({
      locale,
      timeZone,
      dateFormat: prefs.dateFormat,
      timeFormat: prefs.timeFormat,
      weekStart: prefs.weekStart,
      formatRelative: (d: DateInput) => formatRelative(d, locale),
      // Canonical absolute rendering (medium date) — used for tooltips and
      // metadata rows that always want a full date regardless of the user's
      // timestamp preset. The preset is honoured by `formatTimestamp` instead.
      formatAbsolute: (d: DateInput, withTime: boolean = true) =>
        formatAbsolute(d, { locale, timeFormat: prefs.timeFormat, withTime, timeZone }),
      formatTime: (d: DateInput) =>
        formatTimeOnly(d, { locale, timeFormat: prefs.timeFormat, timeZone }),
      /** Region-aware calendar date range (no time zone — calendar dates). */
      formatRange: (startIso: string, endIso: string) => formatRange(startIso, endIso, locale),
      /** Honours the dateFormat preference. */
      formatTimestamp: (d: DateInput) =>
        formatTimestamp(d, {
          locale,
          dateFormat: prefs.dateFormat,
          timeFormat: prefs.timeFormat,
          timeZone,
        }),
    }),
    [locale, timeZone, prefs.dateFormat, prefs.timeFormat, prefs.weekStart],
  );
}
