import type { BranchInfo } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { LocationFlag, TrackingFlag } from "@/lib/constants/branchesFilter.constants";
import {
  matchLocationFilter,
  matchSearchFilter,
  matchTrackingFilter,
} from "@/lib/utils/branchFilters.utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBranch(overrides: Partial<BranchInfo> = {}): BranchInfo {
  return {
    name: "feature/my-branch",
    isCurrent: false,
    isRemote: false,
    remote: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    clean: true,
    lastCommit: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// matchTrackingFilter
// ---------------------------------------------------------------------------

describe("matchTrackingFilter", () => {
  it("returns true for any branch when tracking is null (no filter)", () => {
    expect(matchTrackingFilter(makeBranch({ ahead: 0, behind: 0, clean: true }), null)).toBe(true);
    expect(matchTrackingFilter(makeBranch({ ahead: 3, behind: 2, clean: false }), null)).toBe(true);
  });

  it("AHEAD — true only when ahead > 0", () => {
    expect(matchTrackingFilter(makeBranch({ ahead: 1 }), TrackingFlag.AHEAD)).toBe(true);
    expect(matchTrackingFilter(makeBranch({ ahead: 5 }), TrackingFlag.AHEAD)).toBe(true);
    expect(matchTrackingFilter(makeBranch({ ahead: 0 }), TrackingFlag.AHEAD)).toBe(false);
  });

  it("AHEAD — branch that is also behind still passes when ahead > 0", () => {
    expect(matchTrackingFilter(makeBranch({ ahead: 2, behind: 3 }), TrackingFlag.AHEAD)).toBe(true);
  });

  it("BEHIND — true only when behind > 0", () => {
    expect(matchTrackingFilter(makeBranch({ behind: 1 }), TrackingFlag.BEHIND)).toBe(true);
    expect(matchTrackingFilter(makeBranch({ behind: 10 }), TrackingFlag.BEHIND)).toBe(true);
    expect(matchTrackingFilter(makeBranch({ behind: 0 }), TrackingFlag.BEHIND)).toBe(false);
  });

  it("BEHIND — branch that is also ahead still passes when behind > 0", () => {
    expect(matchTrackingFilter(makeBranch({ ahead: 1, behind: 4 }), TrackingFlag.BEHIND)).toBe(
      true,
    );
  });

  it("CLEAN — true only when clean is true", () => {
    expect(matchTrackingFilter(makeBranch({ clean: true }), TrackingFlag.CLEAN)).toBe(true);
    expect(matchTrackingFilter(makeBranch({ clean: false }), TrackingFlag.CLEAN)).toBe(false);
  });

  it("CLEAN — dirty branch (ahead=0, behind=0, clean=false) is excluded", () => {
    expect(
      matchTrackingFilter(makeBranch({ ahead: 0, behind: 0, clean: false }), TrackingFlag.CLEAN),
    ).toBe(false);
  });

  it("empty-list scenario — no branches produce no results (each returns false)", () => {
    const flags: TrackingFlag[] = [TrackingFlag.AHEAD, TrackingFlag.BEHIND, TrackingFlag.CLEAN];
    const branch = makeBranch({ ahead: 0, behind: 0, clean: false });
    const results = flags.map((f) => matchTrackingFilter(branch, f));
    expect(results).toEqual([false, false, false]);
  });
});

// ---------------------------------------------------------------------------
// matchLocationFilter
// ---------------------------------------------------------------------------

describe("matchLocationFilter", () => {
  it("returns true for any branch when location is null (no filter)", () => {
    expect(matchLocationFilter(makeBranch({ isRemote: false }), null)).toBe(true);
    expect(matchLocationFilter(makeBranch({ isRemote: true }), null)).toBe(true);
  });

  it("LOCAL — true only when isRemote is false", () => {
    expect(matchLocationFilter(makeBranch({ isRemote: false }), LocationFlag.LOCAL)).toBe(true);
    expect(matchLocationFilter(makeBranch({ isRemote: true }), LocationFlag.LOCAL)).toBe(false);
  });

  it("REMOTE — true only when isRemote is true", () => {
    expect(matchLocationFilter(makeBranch({ isRemote: true }), LocationFlag.REMOTE)).toBe(true);
    expect(matchLocationFilter(makeBranch({ isRemote: false }), LocationFlag.REMOTE)).toBe(false);
  });

  it("local and remote flags are mutually exclusive for the same branch", () => {
    const local = makeBranch({ isRemote: false });
    const remote = makeBranch({ isRemote: true });
    // A local branch matches LOCAL but not REMOTE
    expect(matchLocationFilter(local, LocationFlag.LOCAL)).toBe(true);
    expect(matchLocationFilter(local, LocationFlag.REMOTE)).toBe(false);
    // A remote branch matches REMOTE but not LOCAL
    expect(matchLocationFilter(remote, LocationFlag.REMOTE)).toBe(true);
    expect(matchLocationFilter(remote, LocationFlag.LOCAL)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchSearchFilter
// ---------------------------------------------------------------------------

describe("matchSearchFilter", () => {
  it("returns true for any branch when query is empty", () => {
    expect(matchSearchFilter(makeBranch({ name: "main" }), "")).toBe(true);
    expect(matchSearchFilter(makeBranch({ name: "some/long/name" }), "")).toBe(true);
  });

  it("matches a local branch name substring using lowercased query (caller pre-normalises)", () => {
    const branch = makeBranch({ name: "feature/Login-Page", isRemote: false });
    // The function lowercases the label internally, so a lowercased query matches case-insensitively.
    expect(matchSearchFilter(branch, "login")).toBe(true);
    expect(matchSearchFilter(branch, "feature")).toBe(true);
    expect(matchSearchFilter(branch, "login-page")).toBe(true);
  });

  it("returns false when query does not match local branch name", () => {
    const branch = makeBranch({ name: "feature/login-page", isRemote: false });
    expect(matchSearchFilter(branch, "signup")).toBe(false);
    expect(matchSearchFilter(branch, "origin/")).toBe(false);
  });

  it("matches remote branch using remote/name label", () => {
    const branch = makeBranch({
      name: "feature/auth",
      isRemote: true,
      remote: "origin",
    });
    expect(matchSearchFilter(branch, "origin/feature")).toBe(true);
    expect(matchSearchFilter(branch, "origin/")).toBe(true);
    expect(matchSearchFilter(branch, "auth")).toBe(true);
  });

  it("returns false when query matches only remote prefix absent from local branch", () => {
    const local = makeBranch({ name: "auth", isRemote: false, remote: null });
    expect(matchSearchFilter(local, "origin/auth")).toBe(false);
  });

  it("remote branch with null remote name — gracefully handles missing remote", () => {
    const branch = makeBranch({ name: "detached", isRemote: true, remote: null });
    // label becomes "/detached" when remote is null — substring still works
    expect(matchSearchFilter(branch, "detached")).toBe(true);
    expect(matchSearchFilter(branch, "other")).toBe(false);
  });

  it("caller provides pre-lowercased query; function lowercases the label for comparison", () => {
    // The function lowercases the label, so a pre-lowercased query matches
    // regardless of the branch name's original casing.
    const branch = makeBranch({ name: "Feature/UPPER", isRemote: false });
    expect(matchSearchFilter(branch, "feature/upper")).toBe(true);
    // A query that is not lowercased by the caller will NOT match (expected caller contract).
    expect(matchSearchFilter(branch, "Feature/UPPER")).toBe(false);
  });

  it("no-match scenario — empty list analogue", () => {
    const branches = [
      makeBranch({ name: "main", isRemote: false }),
      makeBranch({ name: "develop", isRemote: false }),
    ];
    const results = branches.filter((b) => matchSearchFilter(b, "hotfix"));
    expect(results).toHaveLength(0);
  });

  it("full match: remote branch found by full remote/name label", () => {
    const branch = makeBranch({ name: "main", isRemote: true, remote: "upstream" });
    expect(matchSearchFilter(branch, "upstream/main")).toBe(true);
  });
});
