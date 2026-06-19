/**
 * Locale-related user preferences — date/time rendering, week-start, an
 * optional country override (drives `Intl` regional formatting) and an
 * optional IANA time zone.
 *
 * Persisted under `appearance.localePrefs` on the backend so any Recrest
 * surface (app + future web preview) reads them from a single source of
 * truth.
 */

export const DateFormat = {
  /** "2 hours ago" / "vor 2 Stunden" — `timeAgo`-style buckets. */
  RELATIVE: "relative",
  /** Locale numeric — "06/18/2026" (en-US) / "18.06.2026" (de). */
  NUMERIC: "numeric",
  /** Localized medium — "Jun 18, 2026" / "18. Juni 2026". */
  MEDIUM: "medium",
  /** Localized long with weekday — "Thursday, June 18, 2026". */
  FULL: "full",
  /** Fixed ISO 8601 — "2026-06-18" regardless of locale. */
  ISO: "iso",
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

/**
 * Full ISO 3166-1 alpha-2 country code list. Display names are resolved at
 * render time via `Intl.DisplayNames(language, { type: "region" })` so we
 * don't ship a localized name table; flags come from `react-country-flag`.
 */
export const COUNTRY_CODES: readonly string[] = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL " +
  "BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV " +
  "CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB " +
  "GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM " +
  "IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI " +
  "LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU " +
  "MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL " +
  "PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN " +
  "SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

/**
 * Primary IANA time zone per country, used to pre-fill the time-zone picker
 * when the user selects a country. For multi-zone countries (US, RU, AU, …)
 * this is a sensible default only — the picker stays fully editable. Countries
 * not listed here simply don't auto-suggest; the user picks a zone manually.
 */
export const COUNTRY_PRIMARY_TIMEZONE: Readonly<Record<string, string>> = {
  AD: "Europe/Andorra",
  AE: "Asia/Dubai",
  AR: "America/Argentina/Buenos_Aires",
  AT: "Europe/Vienna",
  AU: "Australia/Sydney",
  BE: "Europe/Brussels",
  BG: "Europe/Sofia",
  BR: "America/Sao_Paulo",
  CA: "America/Toronto",
  CH: "Europe/Zurich",
  CL: "America/Santiago",
  CN: "Asia/Shanghai",
  CO: "America/Bogota",
  CZ: "Europe/Prague",
  DE: "Europe/Berlin",
  DK: "Europe/Copenhagen",
  EE: "Europe/Tallinn",
  EG: "Africa/Cairo",
  ES: "Europe/Madrid",
  FI: "Europe/Helsinki",
  FR: "Europe/Paris",
  GB: "Europe/London",
  GR: "Europe/Athens",
  HK: "Asia/Hong_Kong",
  HR: "Europe/Zagreb",
  HU: "Europe/Budapest",
  ID: "Asia/Jakarta",
  IE: "Europe/Dublin",
  IL: "Asia/Jerusalem",
  IN: "Asia/Kolkata",
  IS: "Atlantic/Reykjavik",
  IT: "Europe/Rome",
  JP: "Asia/Tokyo",
  KR: "Asia/Seoul",
  LT: "Europe/Vilnius",
  LU: "Europe/Luxembourg",
  LV: "Europe/Riga",
  MX: "America/Mexico_City",
  MY: "Asia/Kuala_Lumpur",
  NL: "Europe/Amsterdam",
  NO: "Europe/Oslo",
  NZ: "Pacific/Auckland",
  PH: "Asia/Manila",
  PL: "Europe/Warsaw",
  PT: "Europe/Lisbon",
  RO: "Europe/Bucharest",
  RS: "Europe/Belgrade",
  RU: "Europe/Moscow",
  SA: "Asia/Riyadh",
  SE: "Europe/Stockholm",
  SG: "Asia/Singapore",
  SI: "Europe/Ljubljana",
  SK: "Europe/Bratislava",
  TH: "Asia/Bangkok",
  TR: "Europe/Istanbul",
  TW: "Asia/Taipei",
  UA: "Europe/Kyiv",
  US: "America/New_York",
  VN: "Asia/Ho_Chi_Minh",
  ZA: "Africa/Johannesburg",
};

export interface LocaleSettings {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStart: WeekStart;
  /** ISO 3166-1 alpha-2 country code, or `null` to follow the active
   *  language (no region subtag on the BCP-47 tag). Drives `Intl` regional
   *  formatting (date order, number separators). */
  region: string | null;
  /** IANA time-zone id (e.g. `"Europe/Berlin"`), or `null` to follow the
   *  host system's zone. */
  timeZone: string | null;
}

export const DEFAULT_LOCALE_SETTINGS: LocaleSettings = {
  dateFormat: DateFormat.RELATIVE,
  timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
  weekStart: WeekStart.MONDAY,
  region: null,
  timeZone: null,
};

/** Legacy `dateFormat` values from before the concrete-format split map to
 *  the closest new preset. Idempotent for already-valid values. */
export function migrateDateFormat(raw: string | null | undefined): DateFormat {
  if (raw === "absolute") return DateFormat.MEDIUM;
  const known = Object.values(DateFormat) as string[];
  return known.includes(raw ?? "") ? (raw as DateFormat) : DateFormat.RELATIVE;
}
