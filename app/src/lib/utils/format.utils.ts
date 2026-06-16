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
