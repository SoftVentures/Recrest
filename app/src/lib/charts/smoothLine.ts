/**
 * Monotone cubic interpolation utility for chart line series (Plan 3 §B.1).
 *
 * Returns an SVG `path` `d` string that draws a smooth curve through the
 * supplied points using monotone-cubic interpolation (Steffen / Fritsch-Carlson
 * variant). Monotonicity preservation matters here because activity charts
 * never have meaningful "overshoot" — a velocity that goes 1 → 5 → 3 should
 * not bow above 5 between samples just to look smooth.
 *
 * Edge cases are deliberate so callers can render the same path string at any
 * data length without branching:
 * - `[]`         → `""`            (no path, render nothing)
 * - `[p]`        → `"M{x},{y}"`    (single move, useful for a dot marker)
 * - `[p0, p1]`   → `"M ... L ..."` (straight line, cubic needs ≥3 samples)
 * - `n ≥ 3`      → `"M ... C ... C ..."` (smooth curve)
 *
 * The path is built with comma-separated coordinates and one space between
 * commands so simple snapshot tests can match it without locale-sensitive
 * number formatting.
 */

export interface Point {
  x: number;
  y: number;
}

/** Round to 3 decimals to keep generated paths short and snapshot-stable. */
function fmt(n: number): string {
  // `+(...)` strips trailing zeros: 1.500 → 1.5, 2.000 → 2. Avoids `.toFixed`
  // chasing in tests while still bounding precision.
  return `${Math.round(n * 1000) / 1000}`;
}

/**
 * Build a smooth SVG path that passes through every supplied point using
 * monotone-cubic Hermite interpolation (Fritsch-Carlson). The curve cannot
 * overshoot the surrounding sample values, which keeps activity-chart lines
 * visually honest.
 */
export function monotoneCubic(points: readonly Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  const p0 = points[0]!;
  if (n === 1) return `M${fmt(p0.x)},${fmt(p0.y)}`;
  if (n === 2) {
    const p1 = points[1]!;
    return `M${fmt(p0.x)},${fmt(p0.y)} L${fmt(p1.x)},${fmt(p1.y)}`;
  }

  // 1. Slopes of each segment.
  const dx: number[] = new Array(n - 1);
  const dy: number[] = new Array(n - 1);
  const slopes: number[] = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dxi = b.x - a.x;
    const dyi = b.y - a.y;
    dx[i] = dxi;
    dy[i] = dyi;
    slopes[i] = dxi === 0 ? 0 : dyi / dxi;
  }

  // 2. Tangents at each knot — Fritsch-Carlson monotone scheme.
  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0]!;
  tangents[n - 1] = slopes[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const m0 = slopes[i - 1]!;
    const m1 = slopes[i]!;
    if (m0 * m1 <= 0) {
      // Sign change or zero slope → flat tangent enforces monotonicity.
      tangents[i] = 0;
    } else {
      tangents[i] = (m0 + m1) / 2;
    }
  }
  // Adjust tangents to satisfy the monotonicity constraint.
  for (let i = 0; i < n - 1; i++) {
    const m = slopes[i]!;
    if (m === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i]! / m;
    const b = tangents[i + 1]! / m;
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangents[i] = t * a * m;
      tangents[i + 1] = t * b * m;
    }
  }

  // 3. Emit cubic Bezier segments. Convert Hermite tangents to Bezier control
  //    points: control distance = (dx / 3) along each tangent direction.
  let d = `M${fmt(p0.x)},${fmt(p0.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const ta = tangents[i]!;
    const tb = tangents[i + 1]!;
    const h = dx[i]!;
    const c1x = a.x + h / 3;
    const c1y = a.y + (h / 3) * ta;
    const c2x = b.x - h / 3;
    const c2y = b.y - (h / 3) * tb;
    d += ` C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(b.x)},${fmt(b.y)}`;
  }
  return d;
}
