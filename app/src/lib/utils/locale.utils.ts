/**
 * Helpers for the language/region/time-zone pickers: localized country
 * options (name resolved via `Intl.DisplayNames`), the full IANA time-zone
 * list (via `Intl.supportedValuesOf` with a fallback), and the host system's
 * zone. Pure functions — no Redux, no React.
 */
import { COUNTRY_CODES } from "@recrest/shared";

import { getCountryForTimezone } from "countries-and-timezones";

export interface CountryOption {
  /** ISO 3166-1 alpha-2 code (also the `react-country-flag` `countryCode`). */
  code: string;
  /** Localized country name in the active UI language. */
  label: string;
}

/** Country options localized to `language`, sorted by display name. Codes the
 *  runtime can't name (returns the code unchanged) are dropped. */
export function countryOptions(language: string): CountryOption[] {
  const lang = (language || "en").split("-")[0] || "en";
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([lang], { type: "region" });
  } catch {
    display = null;
  }
  return COUNTRY_CODES.map((code) => {
    let label = code;
    try {
      label = display?.of(code) ?? code;
    } catch {
      label = code;
    }
    return { code, label };
  })
    .filter((o) => o.label && o.label !== o.code)
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}

// Minimal fallback for runtimes without `Intl.supportedValuesOf` (pre-ES2022).
const FALLBACK_TIME_ZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

/** All IANA time-zone ids the runtime knows, alphabetical. Falls back to a
 *  curated short list on older runtimes. */
export function timeZoneOptions(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf;
    if (typeof supported === "function") {
      const zones = supported("timeZone");
      if (Array.isArray(zones) && zones.length > 0) return zones;
    }
  } catch {
    /* fall through to the curated list */
  }
  return FALLBACK_TIME_ZONES;
}

/** ISO 3166-1 alpha-2 country code for an IANA zone (for the flag), or `null`
 *  if the zone maps to no single country. */
export function timeZoneCountryCode(zone: string): string | null {
  try {
    return getCountryForTimezone(zone)?.id ?? null;
  } catch {
    return null;
  }
}

/** Localized weekday name for a JS `getDay()` index (0=Sunday…6=Saturday).
 *  2024-01-07 is a Sunday, so `7 + index` lands on the matching weekday. */
export function weekdayLabel(
  weekdayIndex: number,
  locale: string,
  style: "long" | "short" = "long",
): string {
  return new Date(2024, 0, 7 + weekdayIndex).toLocaleDateString(locale, { weekday: style });
}

/** The host system's IANA zone, e.g. `"Europe/Berlin"`. */
export function systemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Fixed-width UTC-offset label for a zone, e.g. `"GMT+02:00"` / `"GMT-03:00"`.
 *  `longOffset` keeps every label the same width so a column of them aligns.
 *  Empty string on failure. */
export function timeZoneOffsetLabel(timeZone: string, now: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(now);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}
