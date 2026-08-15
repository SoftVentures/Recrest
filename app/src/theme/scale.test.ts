import { describe, expect, it } from "vitest";

import {
  BASE_BREAKPOINT_PX,
  DEFAULT_UI_SCALE,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  clampUiScale,
  fontPxToRem,
  matchMediaDown,
  mediaDown,
  mediaUp,
  pxToRem,
  pxToRems,
  remToPx,
  scaledBreakpointValues,
  stepUiScale,
  textScaleForFontSize,
} from "@/theme/scale";

describe("pxToRem", () => {
  // The migration's core invariant: at scale 1 every design pixel has to come
  // back out as the same rendered pixel, or the visual baselines move.
  it.each([
    [13, "0.8125rem"],
    [16, "1rem"],
    [11.5, "0.71875rem"],
    [64, "4rem"],
    [1, "0.0625rem"],
    [0, "0rem"],
  ])("converts %ipx to %s", (px, expected) => {
    expect(pxToRem(px)).toBe(expected);
    expect(remToPx(parseFloat(expected))).toBeCloseTo(px, 10);
  });

  it("joins shorthand values", () => {
    expect(pxToRems(8, 10)).toBe("0.5rem 0.625rem");
  });

  it("routes font sizes through the text-scale variable", () => {
    // The multiplier defaults to 1, so the rendered size is unchanged until
    // the user moves the "Font size" setting.
    expect(fontPxToRem(13)).toBe("calc(0.8125rem * var(--text-scale, 1))");
  });
});

describe("clampUiScale", () => {
  it("snaps to the slider step and clamps to the supported range", () => {
    expect(clampUiScale(1)).toBe(1);
    expect(clampUiScale(1.234)).toBe(1.25);
    expect(clampUiScale(0.1)).toBe(UI_SCALE_MIN);
    expect(clampUiScale(9)).toBe(UI_SCALE_MAX);
  });

  it("snaps the legacy zooms the fontSize migration derives", () => {
    // Off-step values would leave the settings slider's thumb between detents.
    expect(clampUiScale(1.12)).toBe(1.1);
    expect(clampUiScale(0.94)).toBe(0.95);
    expect(clampUiScale(1.25)).toBe(1.25);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampUiScale(Number.NaN)).toBe(DEFAULT_UI_SCALE);
    expect(clampUiScale(undefined as unknown as number)).toBe(DEFAULT_UI_SCALE);
  });

  it("does not drift over repeated hotkey steps", () => {
    let scale = DEFAULT_UI_SCALE;
    for (let i = 0; i < 6; i += 1) scale = stepUiScale(scale, 1);
    expect(scale).toBe(1.3);
    for (let i = 0; i < 20; i += 1) scale = stepUiScale(scale, -1);
    expect(scale).toBe(UI_SCALE_MIN);
  });
});

describe("textScaleForFontSize", () => {
  it("is exactly 1 at md so the default rendering never moves", () => {
    expect(textScaleForFontSize("md")).toBe(1);
  });

  it("grows and shrinks around md", () => {
    expect(textScaleForFontSize("sm")).toBeLessThan(1);
    expect(textScaleForFontSize("lg")).toBeGreaterThan(1);
    expect(textScaleForFontSize("xl")).toBeGreaterThan(textScaleForFontSize("lg"));
  });
});

describe("breakpoints", () => {
  it("passes design values straight through at scale 1", () => {
    expect(scaledBreakpointValues(1)).toEqual({ ...BASE_BREAKPOINT_PX });
  });

  it("scales every step so the query tracks the effective design width", () => {
    // A 1440 px window at scale 1.25 has 1152 design px of room, so `xl`
    // (1280 design px) has to fire — 1440 < 1600.
    expect(scaledBreakpointValues(1.25).xl).toBe(1600);
    expect(scaledBreakpointValues(1.25).xs).toBe(0);
  });

  it("builds scale-aware media queries", () => {
    expect(mediaDown(1200, 1)).toBe("@media (max-width:1200px)");
    expect(mediaDown(1200, 1.25)).toBe("@media (max-width:1500px)");
    expect(mediaUp(1200, 1.25)).toBe("@media (min-width:1500px)");
    expect(matchMediaDown(1199, 1.25)).toBe("(max-width:1498.75px)");
  });
});
