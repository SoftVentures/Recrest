/** Clamp `n` between `min` and `max`. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Clamp `n` to the closed interval `[0, 1]`. */
export function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

/** Alias for {@link clamp01} kept for compatibility with chart helpers. */
export const clampUnit = clamp01;
