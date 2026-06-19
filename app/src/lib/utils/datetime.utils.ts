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

/** Relative time bucketed to "just now / N min ago / N hr ago / N d ago". The
 *  `t` argument lets callers route through i18n; we accept a fallback so the
 *  helper stays usable from non-React contexts. */
export function formatRelative(input: DateInput, _locale: string = "en"): string {
  const ts = toDate(input).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  return `${Math.round(diff / 86400)} d ago`;
}

export interface AbsoluteFormatOptions {
  locale: string;
  timeFormat: TimeFormat;
  /** Include the time component (default true). */
  withTime?: boolean;
}

/** Absolute locale-aware date+time string respecting the 12h/24h preference. */
export function formatAbsolute(input: DateInput, opts: AbsoluteFormatOptions): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "—";
  const withTime = opts.withTime !== false;
  const fmt = new Intl.DateTimeFormat(opts.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: opts.timeFormat === TimeFormat.TWELVE_HOUR,
        }
      : {}),
  });
  return fmt.format(d);
}

/** Time-only string respecting the 12h/24h preference. */
export function formatTimeOnly(
  input: DateInput,
  opts: { locale: string; timeFormat: TimeFormat },
): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(opts.locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: opts.timeFormat === TimeFormat.TWELVE_HOUR,
  }).format(d);
}

export interface TimestampFormatOptions {
  locale: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
}

/** Honours the dateFormat preference: relative timestamps render as
 *  `formatRelative`; absolute as `formatAbsolute` (with the chosen clock). */
export function formatTimestamp(input: DateInput, opts: TimestampFormatOptions): string {
  if (opts.dateFormat === DateFormat.ABSOLUTE) {
    return formatAbsolute(input, { locale: opts.locale, timeFormat: opts.timeFormat });
  }
  return formatRelative(input, opts.locale);
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

  return useMemo(
    () => ({
      locale,
      dateFormat: prefs.dateFormat,
      timeFormat: prefs.timeFormat,
      weekStart: prefs.weekStart,
      formatRelative: (d: DateInput) => formatRelative(d, locale),
      formatAbsolute: (d: DateInput, withTime: boolean = true) =>
        formatAbsolute(d, { locale, timeFormat: prefs.timeFormat, withTime }),
      formatTime: (d: DateInput) => formatTimeOnly(d, { locale, timeFormat: prefs.timeFormat }),
      /** Honours the dateFormat preference. */
      formatTimestamp: (d: DateInput) =>
        formatTimestamp(d, { locale, dateFormat: prefs.dateFormat, timeFormat: prefs.timeFormat }),
    }),
    [locale, prefs.dateFormat, prefs.timeFormat, prefs.weekStart],
  );
}
