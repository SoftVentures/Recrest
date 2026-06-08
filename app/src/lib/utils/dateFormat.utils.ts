// Locale-aware date formatting. Uses the active i18next language so the
// rendered date follows the user's preference (en → "May 26, 2026" / de →
// "26. Mai 2026") and stays in sync with the rest of the UI on locale
// toggle. Falls back to the browser default if i18next isn't initialised
// yet (during early bootstrap or in tests).
import i18n from "@/locales";

const DEFAULT_LOCALE = "en";

function currentLocale(): string {
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE).split("-")[0];
  return lang || DEFAULT_LOCALE;
}

/** Long-form date — e.g. "May 26, 2026" (en) / "26. Mai 2026" (de). Useful
 *  for metadata rows where space is plentiful and the absolute date matters
 *  more than the year-month-day ordering. */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(currentLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Short-form date — e.g. "May 26, 2026" / "26 May 2026" (en) /
 *  "26. Mai 2026" (de). Same locale awareness as `formatDateLong` but with
 *  a shorter month token, for tight columns where the absolute date still
 *  needs to read at a glance. */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(currentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Date-only keys ("2026-05-28") parse as UTC midnight via `new Date`, which
 *  can render as the previous day in a timezone behind UTC. Insight day-buckets
 *  are computed in local time, so read bare dates as LOCAL midnight; full ISO
 *  timestamps are passed through unchanged. */
function parseFlexible(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
}

/** Localized date range — e.g. "May 28 – Jun 8, 2026" (en) /
 *  "28. Mai – 8. Juni 2026" (de). The shared year is collapsed onto the end
 *  date; a same-day range renders as a single date. Date-only inputs are read
 *  as local midnight (see `parseFlexible`). Falls back to the raw
 *  "start – end" string if either bound is unparseable. */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseFlexible(startIso);
  const end = parseFlexible(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startIso} – ${endIso}`;
  }
  const locale = currentLocale();
  const full: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  if (start.getTime() === end.getTime()) return start.toLocaleDateString(locale, full);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : full;
  return `${start.toLocaleDateString(locale, startOpts)} – ${end.toLocaleDateString(locale, full)}`;
}

/** Short-form date + time — e.g. "May 26, 2026 14:32" (en) /
 *  "26. Mai 2026, 14:32" (de). Use in dense rows like timeline entries
 *  where we want to surface the hour, not just the calendar day. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(currentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
