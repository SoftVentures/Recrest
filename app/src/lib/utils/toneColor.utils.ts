import type { Theme } from "@mui/material/styles";

/** Status tones that map to a MUI palette color with light/main/dark shades.
 *  Use these constants instead of raw `"success"`-style strings at call sites. */
export const StatusTone = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  PRIMARY: "primary",
} as const;

export type StatusTone = (typeof StatusTone)[keyof typeof StatusTone];

/**
 * Readable colors for a faint-tinted status chip/badge, theme-mode aware.
 *
 * The faint `color-mix(main, …%)` background carries the hue; the text flips to
 * the palette's LIGHT shade on dark themes and DARK on light themes. The old
 * pattern (always `.dark` text) was unreadable on a dark-theme tint — dark text
 * on a dark background.
 */
export function toneChip(
  theme: Theme,
  tone: StatusTone,
  bgAlphaPct = 18,
): { backgroundColor: string; color: string } {
  const c = theme.palette[tone];
  return {
    backgroundColor: `color-mix(in srgb, ${c.main} ${bgAlphaPct}%, transparent)`,
    color: theme.palette.mode === "dark" ? c.light : c.dark,
  };
}

/**
 * Mode-aware readable text color for a status tone on a plain (untinted)
 * surface — e.g. coloured `+12 / −3` diff counters. Same flip rule as
 * `toneChip`: light shade on dark themes, dark shade on light themes.
 */
export function toneText(theme: Theme, tone: StatusTone): string {
  const c = theme.palette[tone];
  return theme.palette.mode === "dark" ? c.light : c.dark;
}
