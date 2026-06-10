import type { ActivityRange } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { planFetchWindow } from "@/lib/activity/fetchPlan";

const RANGE: ActivityRange = {
  since: "2026-01-01T00:00:00.000Z",
  until: "2026-02-01T00:00:00.000Z",
};

const loaded = (r: ActivityRange | null) => ({ rangeLoaded: r });

describe("planFetchWindow", () => {
  it("returns null when every known repo already fully covers the range", () => {
    const commitsByRepo = { "repo-1": loaded(RANGE), "repo-2": loaded(RANGE) };
    expect(planFetchWindow(["repo-1", "repo-2"], commitsByRepo, RANGE)).toBeNull();
  });

  it("fetches the whole range when nothing is loaded yet", () => {
    expect(planFetchWindow(["repo-1"], {}, RANGE)).toEqual(RANGE);
  });

  it("forces a full-range fetch for a freshly-scanned repo with no commits entry", () => {
    // repo-1 covers the range, repo-2 was just scanned and has no entry — it
    // must still be walked instead of being silently skipped.
    const commitsByRepo = { "repo-1": loaded(RANGE) };
    expect(planFetchWindow(["repo-1", "repo-2"], commitsByRepo, RANGE)).toEqual(RANGE);
  });

  it("forces a full-range fetch when a known repo has a null loaded range", () => {
    const commitsByRepo = { "repo-1": loaded(RANGE), "repo-2": loaded(null) };
    expect(planFetchWindow(["repo-1", "repo-2"], commitsByRepo, RANGE)).toEqual(RANGE);
  });

  it("fetches only the missing later gap when loaded repos partially cover the range", () => {
    const partial: ActivityRange = {
      since: "2026-01-01T00:00:00.000Z",
      until: "2026-01-15T00:00:00.000Z",
    };
    const commitsByRepo = { "repo-1": loaded(partial) };
    expect(planFetchWindow(["repo-1"], commitsByRepo, RANGE)).toEqual({
      since: "2026-01-15T00:00:00.000Z",
      until: "2026-02-01T00:00:00.000Z",
    });
  });
});
