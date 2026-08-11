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

  it("treats a repo that reported zero commits as fetched, not as unloaded", () => {
    // `list_commits` emits a totals/truncated entry for every repo it visited —
    // including one it could not open — so the reducer gives it a non-null
    // rangeLoaded even though it contributed no commits. Without that the
    // planner would re-walk the whole window on every range switch forever.
    const commitsByRepo = { "repo-1": loaded(RANGE), "unreadable-repo": loaded(RANGE) };
    expect(planFetchWindow(["repo-1", "unreadable-repo"], commitsByRepo, RANGE)).toBeNull();
  });

  it("keeps the cache warm across repeated plans once every repo is marked fetched", () => {
    const commitsByRepo = { "repo-1": loaded(RANGE), "unreadable-repo": loaded(RANGE) };
    const ids = ["repo-1", "unreadable-repo"];
    expect(planFetchWindow(ids, commitsByRepo, RANGE)).toBeNull();
    expect(planFetchWindow(ids, commitsByRepo, RANGE)).toBeNull();
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
