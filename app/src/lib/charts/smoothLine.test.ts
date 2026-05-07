import { describe, expect, it } from "vitest";

import { monotoneCubic } from "@/lib/charts/smoothLine";

describe("monotoneCubic", () => {
  it("returns an empty string for zero points", () => {
    expect(monotoneCubic([])).toBe("");
  });

  it("returns a single move command for one point", () => {
    expect(monotoneCubic([{ x: 5, y: 10 }])).toBe("M5,10");
  });

  it("returns a straight line segment for two points", () => {
    expect(
      monotoneCubic([
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ]),
    ).toBe("M0,0 L10,5");
  });

  it("emits one cubic segment per interval for three points", () => {
    const path = monotoneCubic([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);
    // Expect a single move followed by exactly two cubic segments (n-1).
    expect(path.startsWith("M0,0")).toBe(true);
    const cubicCount = (path.match(/C/g) ?? []).length;
    expect(cubicCount).toBe(2);
  });

  it("does not overshoot bounds for monotone-then-flat data", () => {
    // For an increasing-then-flat series the smoothed path must stay between
    // the surrounding sample values along the y-axis. We sanity-check by
    // verifying that all numeric tokens fall within [minY, maxY] of input.
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
    ];
    const path = monotoneCubic(points);
    // Numbers in the path appear as `,<num>` or ` <num>,` — extract all.
    const matches = path.match(/-?\d+(?:\.\d+)?/g) ?? [];
    const ys: number[] = [];
    // Coordinates are written `x,y` separated by spaces so every other number
    // in C-blocks is a y-value. Easier: just assert no value exceeds 5 + a
    // tiny epsilon (no overshoot).
    for (const m of matches) {
      const v = Number.parseFloat(m);
      ys.push(v);
    }
    for (const v of ys) {
      expect(v).toBeLessThanOrEqual(5.0001);
      expect(v).toBeGreaterThanOrEqual(-0.0001);
    }
  });

  it("does not overshoot for non-monotonic series", () => {
    // The defining property of a monotone-cubic interpolant: the curve never
    // overshoots the surrounding sample values. For a non-monotone series
    // every interpolated y must stay between the global min and max of the
    // input ys (within numeric epsilon).
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: 1 },
      { x: 3, y: 4 },
    ];
    const path = monotoneCubic(points);
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    // Path syntax: `M x,y L x,y` (two-point case) or
    // `M x,y C cx1,cy1 cx2,cy2 x,y C ...`. Every segment ends in
    // `<command><x>,<y>` — capture each y so we can assert bounds. Also
    // include the cubic control points: even though the curve does not
    // pass through them, monotone-cubic chooses tangents that keep the
    // curve inside the input envelope, and Bézier curves are bounded by
    // their control polygon — so verifying the control points respect
    // the bounds tightens the no-overshoot guarantee.
    const coordRe = /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;
    const ys: number[] = [];
    for (const m of path.matchAll(coordRe)) {
      const yStr = m[2];
      if (yStr === undefined) continue;
      ys.push(Number.parseFloat(yStr));
    }

    expect(ys.length).toBeGreaterThan(0);
    for (const y of ys) {
      expect(y).toBeLessThanOrEqual(maxY + 0.0001);
      expect(y).toBeGreaterThanOrEqual(minY - 0.0001);
    }
  });

  it("scales to many points without producing NaN", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 3) * 10,
    }));
    const path = monotoneCubic(points);
    expect(path.length).toBeGreaterThan(0);
    expect(path).not.toMatch(/NaN/);
    // n - 1 = 19 cubic segments.
    expect((path.match(/C/g) ?? []).length).toBe(19);
  });
});
