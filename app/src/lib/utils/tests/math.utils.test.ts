import { describe, expect, it } from "vitest";

import { clamp, clamp01, clampUnit } from "@/lib/utils/math.utils";

describe("clamp", () => {
  it("returns the value when in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to min when below", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("clamps to max when above", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("clamp01", () => {
  it.each([
    [-0.5, 0],
    [0, 0],
    [0.42, 0.42],
    [1, 1],
    [2.7, 1],
  ])("clamp01(%s) === %s", (input, expected) => {
    expect(clamp01(input)).toBe(expected);
  });
});

describe("clampUnit", () => {
  it("is the same function as clamp01", () => {
    expect(clampUnit).toBe(clamp01);
  });
});
