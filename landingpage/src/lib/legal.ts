/**
 * ISO date the legal documents (privacy policy, accessibility statement) were
 * last reviewed. Bump this whenever the legal copy changes — the BFSG /
 * EU 2016/2102 accessibility statement legally requires a creation/review date.
 */
export const LEGAL_LAST_REVIEWED = "2026-06-11";

/**
 * Format an ISO date for display in the visitor's locale. Kept here (rather
 * than rendering the raw ISO string) so the legal pages show e.g. "11. Juni
 * 2026" / "June 11, 2026" depending on the active language.
 */
export function formatLegalDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
