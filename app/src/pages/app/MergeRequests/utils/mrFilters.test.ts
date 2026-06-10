import { CiStatus, PrState, type PullRequest } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  EMPTY_MR_FILTERS,
  activeMrFilterCount,
  applyMrFilters,
  cloneMrFilters,
  toggleInSet,
} from "@/pages/app/MergeRequests/utils/mrFilters";

const basePr = (over: Partial<PullRequest>): PullRequest => ({
  id: "pr-1",
  number: 1,
  title: "T",
  url: "u",
  author: "alice",
  state: PrState.OPEN,
  draft: false,
  sourceBranch: "f",
  targetBranch: "main",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  additions: 1,
  deletions: 0,
  ciStatus: CiStatus.SUCCESS,
  ...over,
});

const row = (
  repoId: string,
  over: Partial<PullRequest> = {},
): { repoId: string; pr: PullRequest } => ({
  repoId,
  pr: basePr(over),
});

const ROWS = [
  row("r1", { author: "alice", ciStatus: CiStatus.SUCCESS, draft: false }),
  row("r1", { number: 2, author: "bob", ciStatus: CiStatus.FAILURE, draft: false }),
  row("r2", { number: 3, author: "alice", ciStatus: CiStatus.RUNNING, draft: true }),
  row("r2", { number: 4, author: "carol", ciStatus: null, draft: false }),
];

describe("applyMrFilters", () => {
  it("passes everything through when filters are empty", () => {
    expect(applyMrFilters(ROWS, EMPTY_MR_FILTERS)).toEqual(ROWS);
  });

  it("filters by repoId whitelist", () => {
    const out = applyMrFilters(ROWS, { ...EMPTY_MR_FILTERS, repoIds: new Set(["r2"]) });
    expect(out.map((r) => r.pr.number)).toEqual([3, 4]);
  });

  it("filters by author whitelist", () => {
    const out = applyMrFilters(ROWS, { ...EMPTY_MR_FILTERS, authors: new Set(["alice"]) });
    expect(out.map((r) => r.pr.number)).toEqual([1, 3]);
  });

  it("hides drafts when includeDrafts is false", () => {
    const out = applyMrFilters(ROWS, { ...EMPTY_MR_FILTERS, includeDrafts: false });
    expect(out.map((r) => r.pr.number)).toEqual([1, 2, 4]);
  });

  it("filters by CI status set (treating null as 'none')", () => {
    const out = applyMrFilters(ROWS, {
      ...EMPTY_MR_FILTERS,
      ciStatuses: new Set([CiStatus.SUCCESS, CiStatus.NONE]),
    });
    expect(out.map((r) => r.pr.number)).toEqual([1, 4]);
  });

  it("combines all dimensions as AND", () => {
    const out = applyMrFilters(ROWS, {
      repoIds: new Set(["r1"]),
      authors: new Set(["alice"]),
      ciStatuses: new Set([CiStatus.SUCCESS]),
      includeDrafts: false,
    });
    expect(out.map((r) => r.pr.number)).toEqual([1]);
  });
});

describe("activeMrFilterCount", () => {
  it("counts each non-empty dimension once", () => {
    expect(activeMrFilterCount(EMPTY_MR_FILTERS)).toBe(0);
    expect(
      activeMrFilterCount({
        repoIds: new Set(["r1"]),
        authors: new Set(),
        ciStatuses: new Set(),
        includeDrafts: true,
      }),
    ).toBe(1);
    expect(
      activeMrFilterCount({
        repoIds: new Set(["r1"]),
        authors: new Set(["alice", "bob"]),
        ciStatuses: new Set([CiStatus.SUCCESS]),
        includeDrafts: false,
      }),
    ).toBe(4);
  });
});

describe("toggleInSet", () => {
  it("adds when missing, removes when present, never mutates the original", () => {
    const a = new Set([1, 2]);
    const added = toggleInSet(a, 3);
    expect([...added].sort()).toEqual([1, 2, 3]);
    expect([...a]).toEqual([1, 2]);
    const removed = toggleInSet(added, 2);
    expect([...removed].sort()).toEqual([1, 3]);
  });
});

describe("cloneMrFilters", () => {
  it("produces independent Sets", () => {
    const a = {
      repoIds: new Set(["r1"]),
      authors: new Set(["alice"]),
      ciStatuses: new Set<CiStatus>([CiStatus.SUCCESS]),
      includeDrafts: false,
    };
    const b = cloneMrFilters(a);
    b.repoIds.add("r2");
    b.authors.delete("alice");
    expect([...a.repoIds]).toEqual(["r1"]);
    expect([...a.authors]).toEqual(["alice"]);
  });
});
