import { useMemo } from "react";

import { useResolvedLocale } from "@/lib/utils/datetime.utils";

/**
 * Human-readable binary byte size. Uses 1024-based units (KiB, MiB, GiB) but
 * keeps the more familiar abbreviations the user sees on Finder/Explorer
 * (B / KB / MB / GB) because those are what every desktop OS displays. The
 * tradeoff: "1.5 MB" here means 1.5 × 1024² bytes, not 1.5 × 10⁶. That matches
 * the rest of the macOS / Windows / Linux file-manager UX even if it differs
 * from SI strictness.
 *
 * Negative or non-finite inputs collapse to "0 B" so callers can pass raw
 * backend numbers without guarding for edge cases.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const decimals = idx === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[idx]}`;
}

/**
 * Locale-aware number rendering (grouping + decimal separators). The
 * counterpart to `datetime.utils`' date helpers: bare `toLocaleString()` picks
 * up the *host* locale, so a German UI on a US machine would render
 * "1,234" instead of "1.234". Always route user-visible numbers through here.
 *
 * Non-finite input collapses to an em dash so callers can pass raw backend
 * numbers without guarding. An unknown/malformed locale tag falls back to
 * `en` rather than throwing.
 */
export function formatNumber(
  value: number,
  locale: string = "en",
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(locale || "en", options).format(value);
  } catch {
    return new Intl.NumberFormat("en", options).format(value);
  }
}

/** `formatNumber` bound to the active UI language + region preference.
 *  Mirrors `useDateTimeFormat` so components never reach for `Intl` directly. */
export function useNumberFormat() {
  const locale = useResolvedLocale();
  return useMemo(
    () => ({
      locale,
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, locale, options),
    }),
    [locale],
  );
}
