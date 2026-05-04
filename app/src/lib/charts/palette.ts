/**
 * Shared chart palette + color helpers (Phase 0.3 umbrella).
 *
 * Owns the curated 14-swatch palette and the deterministic per-repo color
 * map used by activity cards and any other chart surface. Centralised here
 * so Plan 1 §B.3 ("einheitlicher colorfade") and Plan 3 §B.x can layer on
 * top without re-introducing parallel palette constants.
 *
 * `activityStats.ts` re-exports `CHART_PALETTE`/`buildRepoColorMap` under
 * their old names for backwards compatibility; new callers should import
 * from here.
 */

/** 14-swatch palette laid out so adjacent slots walk around the hue wheel —
 *  any sequential assignment lands on perceptually distinct neighbours even
 *  at small bar-segment sizes. We only keep one swatch per hue family (no
 *  indigo + sky + blue + cyan stack) so 3-blue collisions can't happen when
 *  the sequential walker picks the first N colors. */
export const CHART_PALETTE = [
  "#6366f1", // indigo
  "#f97316", // orange
  "#14b8a6", // teal
  "#ec4899", // pink
  "#eab308", // yellow
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#84cc16", // lime
  "#f59e0b", // amber
  "#0ea5e9", // sky
  "#f43f5e", // rose
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable color for an id when no chart context is available. Hash-based so
 *  the same id always resolves to the same swatch across unrelated UI
 *  surfaces. Prefer [`buildRepoColorMap`] when you need guaranteed
 *  uniqueness within one chart. */
export function colorForRepo(id: string): string {
  return CHART_PALETTE[hashString(id) % CHART_PALETTE.length]!;
}

/** Build a collision-free color map for a specific chart context. Walks the
 *  unique id set in deterministic order (sorted) and assigns palette
 *  entries one at a time, so two ids in the same chart never share a color
 *  — critical for stacked bars where adjacent segments must read as
 *  distinct. Falls back to the hash once count exceeds palette size. */
export function buildRepoColorMap(ids: readonly string[]): Map<string, string> {
  const unique = Array.from(new Set(ids)).sort();
  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i++) {
    const id = unique[i]!;
    if (i < CHART_PALETTE.length) {
      map.set(id, CHART_PALETTE[i]!);
    } else {
      map.set(id, colorForRepo(id));
    }
  }
  return map;
}

// ─── Color manipulation helpers (HSL-based, no lib dep) ───

function clampUnit(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const n = parseInt(v, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (x: number) =>
    Math.round(Math.max(0, Math.min(255, x)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hh = h / 360;
  return [
    hue2rgb(p, q, hh + 1 / 3) * 255,
    hue2rgb(p, q, hh) * 255,
    hue2rgb(p, q, hh - 1 / 3) * 255,
  ];
}

/**
 * Returns the input color as an `rgba()` string with the supplied alpha
 * (0..1). Used for chart fill/area gradients ("colorfade") so every chart
 * fades the same way from solid swatch → transparent.
 */
export function fade(color: string, alpha: number): string {
  const [r, g, b] = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${clampUnit(alpha)})`;
}

/**
 * Adjusts the lightness of a color by `delta` (e.g. `+0.1` lightens by 10
 * percentage points, `-0.1` darkens). Saturates at [0, 1].
 */
export function shade(color: string, delta: number): string {
  const [r, g, b] = hexToRgb(color);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [r2, g2, b2] = hslToRgb(h, s, clampUnit(l + delta));
  return rgbToHex(r2, g2, b2);
}
