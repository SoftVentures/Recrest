import { describe, expect, it } from "vitest";

import { mergeRange, missingSubranges, rangesOverlap } from "@/lib/activity/rangeMerge";

const R = (since: string, until: string) => ({ since, until });

describe("rangesOverlap", () => {
  it("true when ranges overlap", () => {
    expect(rangesOverlap(R("2026-01-01", "2026-02-01"), R("2026-01-15", "2026-03-01"))).toBe(true);
  });

  it("true when ranges merely touch at a boundary", () => {
    expect(rangesOverlap(R("2026-01-01", "2026-02-01"), R("2026-02-01", "2026-03-01"))).toBe(true);
  });

  it("false when ranges are disjoint", () => {
    expect(rangesOverlap(R("2026-01-01", "2026-01-10"), R("2026-03-01", "2026-03-10"))).toBe(false);
  });
});

describe("missingSubranges", () => {
  it("null loaded → whole requested range is missing", () => {
    expect(missingSubranges(null, R("2026-01-01", "2026-02-01"))).toEqual([
      R("2026-01-01", "2026-02-01"),
    ]);
  });

  it("subset → nothing missing", () => {
    expect(missingSubranges(R("2026-01-01", "2026-03-01"), R("2026-01-10", "2026-02-01"))).toEqual(
      [],
    );
  });

  it("overlap left → only the earlier gap is missing", () => {
    expect(missingSubranges(R("2026-02-01", "2026-03-01"), R("2026-01-01", "2026-02-15"))).toEqual([
      R("2026-01-01", "2026-02-01"),
    ]);
  });

  it("overlap right → only the later gap is missing", () => {
    expect(missingSubranges(R("2026-01-01", "2026-02-01"), R("2026-01-15", "2026-03-01"))).toEqual([
      R("2026-02-01", "2026-03-01"),
    ]);
  });

  it("requested superset → both gaps are missing", () => {
    expect(missingSubranges(R("2026-02-01", "2026-02-15"), R("2026-01-01", "2026-03-01"))).toEqual([
      R("2026-01-01", "2026-02-01"),
      R("2026-02-15", "2026-03-01"),
    ]);
  });

  it("disjoint → whole requested range is missing (loaded gets replaced)", () => {
    expect(missingSubranges(R("2026-01-01", "2026-01-10"), R("2026-03-01", "2026-03-10"))).toEqual([
      R("2026-03-01", "2026-03-10"),
    ]);
  });
});

describe("mergeRange", () => {
  it("expands loaded to the union on overlap", () => {
    expect(mergeRange(R("2026-01-01", "2026-02-01"), R("2026-01-15", "2026-03-01"))).toEqual(
      R("2026-01-01", "2026-03-01"),
    );
  });

  it("disjoint replaces loaded with requested (single-range invariant)", () => {
    expect(mergeRange(R("2026-01-01", "2026-01-10"), R("2026-03-01", "2026-03-10"))).toEqual(
      R("2026-03-01", "2026-03-10"),
    );
  });

  it("null loaded → requested", () => {
    expect(mergeRange(null, R("2026-01-01", "2026-02-01"))).toEqual(R("2026-01-01", "2026-02-01"));
  });

  it("identical ranges are a no-op", () => {
    expect(mergeRange(R("2026-01-01", "2026-02-01"), R("2026-01-01", "2026-02-01"))).toEqual(
      R("2026-01-01", "2026-02-01"),
    );
  });
});
