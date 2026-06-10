import type { ActivityRange } from "@recrest/shared";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVITY_RANGE_ALL_KEY, ACTIVITY_RANGE_DAY_MS } from "@/lib/constants/activity.constants";
import { presetKeyFromRange, rangeFromPresetKey } from "@/lib/utils/activityRange.utils";

const NOW = new Date("2026-06-09T12:00:00.000Z");

describe("rangeFromPresetKey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for an unknown key", () => {
    expect(rangeFromPresetKey("nonsense", null)).toBeNull();
  });

  it("returns null for the `all` key when the oldest date is unknown", () => {
    expect(rangeFromPresetKey(ACTIVITY_RANGE_ALL_KEY, null)).toBeNull();
  });

  it("resolves `all` to [oldestDate, now] when the oldest date is known", () => {
    const oldest = "2020-01-01T00:00:00.000Z";
    const range = rangeFromPresetKey(ACTIVITY_RANGE_ALL_KEY, oldest);
    expect(range).toEqual({ since: oldest, until: NOW.toISOString() });
  });

  it("resolves a fixed-window preset to [now - days, now]", () => {
    const range = rangeFromPresetKey("7d", null);
    expect(range).toEqual({
      since: new Date(NOW.getTime() - 7 * ACTIVITY_RANGE_DAY_MS).toISOString(),
      until: NOW.toISOString(),
    });
  });

  it("scales the window with the preset day count", () => {
    const range = rangeFromPresetKey("1y", null);
    expect(range).toEqual({
      since: new Date(NOW.getTime() - 365 * ACTIVITY_RANGE_DAY_MS).toISOString(),
      until: NOW.toISOString(),
    });
  });
});

describe("presetKeyFromRange", () => {
  const window = (days: number): ActivityRange => ({
    since: new Date(NOW.getTime() - days * ACTIVITY_RANGE_DAY_MS).toISOString(),
    until: NOW.toISOString(),
  });

  it("matches a preset whose day-width equals the window", () => {
    expect(presetKeyFromRange(window(30), null)).toBe("30d");
  });

  it("matches within ±1 day of drift", () => {
    const value: ActivityRange = {
      since: new Date(NOW.getTime() - 91 * ACTIVITY_RANGE_DAY_MS).toISOString(),
      until: NOW.toISOString(),
    };
    expect(presetKeyFromRange(value, null)).toBe("90d");
  });

  it("prefers a fixed preset over `all` for a young repo inside the window", () => {
    // 30d window but the oldest commit is only 10 days back — still "30d".
    const oldest = new Date(NOW.getTime() - 10 * ACTIVITY_RANGE_DAY_MS).toISOString();
    expect(presetKeyFromRange(window(30), oldest)).toBe("30d");
  });

  it("falls back to `all` when the range reaches back to the oldest commit", () => {
    const oldest = "2020-01-01T00:00:00.000Z";
    const value: ActivityRange = { since: oldest, until: NOW.toISOString() };
    expect(presetKeyFromRange(value, oldest)).toBe(ACTIVITY_RANGE_ALL_KEY);
  });

  it("treats a since before the oldest date as `all`", () => {
    const oldest = "2020-06-01T00:00:00.000Z";
    const value: ActivityRange = { since: "2019-01-01T00:00:00.000Z", until: NOW.toISOString() };
    expect(presetKeyFromRange(value, oldest)).toBe(ACTIVITY_RANGE_ALL_KEY);
  });

  it("returns null for a custom range that matches no preset and no oldest date", () => {
    // 50-day window — not within ±1 of any preset (7/14/30/90/365).
    expect(presetKeyFromRange(window(50), null)).toBeNull();
  });

  it("returns null for a custom range narrower than the oldest commit window", () => {
    // 50-day window, oldest is 100 days back → not `all`, matches no preset.
    const oldest = new Date(NOW.getTime() - 100 * ACTIVITY_RANGE_DAY_MS).toISOString();
    expect(presetKeyFromRange(window(50), oldest)).toBeNull();
  });
});
