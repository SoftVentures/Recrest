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
