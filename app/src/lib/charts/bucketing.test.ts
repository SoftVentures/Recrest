import { describe, expect, it } from "vitest";

import { bucketDays, bucketSizeForWindow, dayLabel } from "@/lib/charts/bucketing";

describe("bucketSizeForWindow", () => {
  it("keeps daily granularity up to 90 days", () => {
    expect(bucketSizeForWindow(1)).toBe(1);
    expect(bucketSizeForWindow(14)).toBe(1);
    expect(bucketSizeForWindow(90)).toBe(1);
  });

  it("switches to weekly buckets past 90 days up to ~14 months", () => {
    expect(bucketSizeForWindow(91)).toBe(7);
    expect(bucketSizeForWindow(365)).toBe(7);
    expect(bucketSizeForWindow(430)).toBe(7);
  });

  it("switches to monthly buckets beyond ~14 months", () => {
    expect(bucketSizeForWindow(431)).toBe(30);
    expect(bucketSizeForWindow(3650)).toBe(30);
  });
});

describe("bucketDays", () => {
  const make = (count: number) => Array.from({ length: count }, (_, day) => ({ day, v: day }));

  it("groups 365 day-rows into 53 weekly buckets", () => {
    const rows = make(365);
    const buckets = bucketDays(rows, (r) => r.day, 7);
    // ceil(365 / 7) = 53
    expect(buckets).toHaveLength(53);
  });

  it("reports the newest day index per bucket", () => {
    const rows = make(21);
    const buckets = bucketDays(rows, (r) => r.day, 7);
    expect(buckets.map((b) => b.newestDay)).toEqual([0, 7, 14]);
    expect(buckets[0]!.bucket).toBe(0);
    expect(buckets[1]!.newestDay).toBe(7);
  });

  it("places each row in the bucket for its own day", () => {
    const rows = make(14);
    const buckets = bucketDays(rows, (r) => r.day, 7);
    expect(buckets[0]!.rows.map((r) => r.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(buckets[1]!.rows.map((r) => r.day)).toEqual([7, 8, 9, 10, 11, 12, 13]);
  });

  it("keeps daily granularity for size 1", () => {
    const rows = make(5);
    const buckets = bucketDays(rows, (r) => r.day, 1);
    expect(buckets).toHaveLength(5);
    expect(buckets.map((b) => b.newestDay)).toEqual([0, 1, 2, 3, 4]);
  });

  it("ignores negative day indices", () => {
    const rows = [{ day: -1 }, { day: 0 }, { day: 3 }];
    const buckets = bucketDays(rows, (r) => r.day, 7);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.rows).toHaveLength(2);
  });

  it("returns an empty array for empty input", () => {
    expect(bucketDays([], (r: { day: number }) => r.day, 7)).toEqual([]);
  });
});

describe("dayLabel", () => {
  const now = new Date("2026-06-03T12:00:00Z");

  it("labels the offset relative to now in the given locale", () => {
    expect(dayLabel(0, "en-US", now)).toBe("Jun 3");
    // 12 days before 3 June is 22 May.
    expect(dayLabel(12, "en-US", now)).toBe("May 22");
  });

  it("localises the month name", () => {
    expect(dayLabel(0, "de-DE", now)).toBe("3. Juni");
  });
});
