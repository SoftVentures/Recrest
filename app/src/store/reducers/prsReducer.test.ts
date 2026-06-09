import type { Comment, FileDiff, PullRequest, PullRequestDetail } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  clearPrs,
  detailKey,
  fetchPullRequests,
  loadPrDetail,
  loadPrDiff,
  postPrComment,
  resetFilters,
  setFilters,
  setPrs,
} from "@/store/actions/prs.actions";
import { deleteRepo, removeRepo } from "@/store/actions/repos.actions";
import { prsReducer } from "@/store/reducers/prsReducer";
import type { PrsState } from "@/store/types/prs.types";

const initial = (): PrsState => prsReducer(undefined, { type: "@@INIT" });

function pr(overrides: Partial<PullRequest> & Pick<PullRequest, "number">): PullRequest {
  return {
    id: overrides.id ?? `pr-${overrides.number}`,
    number: overrides.number,
    title: overrides.title ?? "Title",
    url: overrides.url ?? "https://example.com/pr",
    author: overrides.author ?? "alice",
    state: overrides.state ?? "open",
    draft: overrides.draft ?? false,
    sourceBranch: overrides.sourceBranch ?? "feature",
    targetBranch: overrides.targetBranch ?? "main",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-02T00:00:00.000Z",
    additions: overrides.additions ?? null,
    deletions: overrides.deletions ?? null,
    ciStatus: overrides.ciStatus ?? null,
  };
}

function detail(number: number): PullRequestDetail {
  return {
    ...pr({ number }),
    body: null,
    mergeable: null,
    reviewers: [],
    files: [],
    timeline: [],
  };
}

function comment(id: string): Comment {
  return {
    id,
    author: "alice",
    body: "looks good",
    path: null,
    createdAt: "2026-01-03T00:00:00.000Z",
  };
}

describe("prsReducer", () => {
  it("sets PRs for a repo via setPrs", () => {
    const next = prsReducer(initial(), setPrs({ repoId: "r1", prs: [pr({ number: 1 })] }));
    expect(next.items["r1"]?.map((p) => p.number)).toEqual([1]);
  });

  it("clears PRs for a repo via clearPrs", () => {
    const seeded = prsReducer(initial(), setPrs({ repoId: "r1", prs: [pr({ number: 1 })] }));
    const next = prsReducer(seeded, clearPrs("r1"));
    expect(next.items["r1"]).toBeUndefined();
  });

  it("merges partial filters via setFilters", () => {
    const next = prsReducer(initial(), setFilters({ draft: "only", author: "bob" }));
    expect(next.filters.draft).toBe("only");
    expect(next.filters.author).toBe("bob");
    // Untouched keys keep their defaults.
    expect(next.filters.state).toEqual(["open"]);
  });

  it("restores default filters via resetFilters", () => {
    const changed = prsReducer(initial(), setFilters({ draft: "hide", state: ["closed"] }));
    const next = prsReducer(changed, resetFilters());
    expect(next.filters.draft).toBe("any");
    expect(next.filters.state).toEqual(["open"]);
  });

  it("sets loading on fetchPullRequests.pending", () => {
    const next = prsReducer(initial(), fetchPullRequests.pending("internal-id", "r1"));
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it("stores PRs and a fetch timestamp on fetchPullRequests.fulfilled", () => {
    const next = prsReducer(
      initial(),
      fetchPullRequests.fulfilled({ repoId: "r1", prs: [pr({ number: 2 })] }, "internal-id", "r1"),
    );
    expect(next.loading).toBe(false);
    expect(next.items["r1"]?.map((p) => p.number)).toEqual([2]);
    expect(typeof next.lastFetched).toBe("number");
  });

  it("records the error on fetchPullRequests.rejected", () => {
    const next = prsReducer(
      initial(),
      fetchPullRequests.rejected(new Error("fetch boom"), "internal-id", "r1"),
    );
    expect(next.error).toBe("fetch boom");
  });

  it("tracks loading state across the loadPrDetail lifecycle", () => {
    const arg = { repoId: "r1", prNumber: 7 };
    const key = detailKey("r1", 7);
    const pending = prsReducer(initial(), loadPrDetail.pending("internal-id", arg));
    expect(pending.detailLoading[key]).toBe(true);
    const fulfilled = prsReducer(
      pending,
      loadPrDetail.fulfilled({ key, detail: detail(7) }, "internal-id", arg),
    );
    expect(fulfilled.detail[key]?.number).toBe(7);
    expect(fulfilled.detailLoading[key]).toBe(false);
  });

  it("clears detail loading on loadPrDetail.rejected", () => {
    const arg = { repoId: "r1", prNumber: 7 };
    const key = detailKey("r1", 7);
    const pending = prsReducer(initial(), loadPrDetail.pending("internal-id", arg));
    const next = prsReducer(pending, loadPrDetail.rejected(new Error("nope"), "internal-id", arg));
    expect(next.detailLoading[key]).toBe(false);
  });

  it("tracks loading state across the loadPrDiff lifecycle", () => {
    const arg = { repoId: "r1", prNumber: 9 };
    const key = detailKey("r1", 9);
    const files: FileDiff[] = [{ path: "a.ts", oldPath: null, status: "modified", hunks: [] }];
    const pending = prsReducer(initial(), loadPrDiff.pending("internal-id", arg));
    expect(pending.diffLoading[key]).toBe(true);
    const fulfilled = prsReducer(pending, loadPrDiff.fulfilled({ key, files }, "internal-id", arg));
    expect(fulfilled.diff[key]?.map((f) => f.path)).toEqual(["a.ts"]);
    expect(fulfilled.diffLoading[key]).toBe(false);
  });

  it("clears diff loading on loadPrDiff.rejected", () => {
    const arg = { repoId: "r1", prNumber: 9 };
    const key = detailKey("r1", 9);
    const pending = prsReducer(initial(), loadPrDiff.pending("internal-id", arg));
    const next = prsReducer(pending, loadPrDiff.rejected(new Error("nope"), "internal-id", arg));
    expect(next.diffLoading[key]).toBe(false);
  });

  it("appends a posted comment on postPrComment.fulfilled", () => {
    const arg = { repoId: "r1", prNumber: 3, body: "looks good" };
    const key = detailKey("r1", 3);
    const first = prsReducer(
      initial(),
      postPrComment.fulfilled({ key, comment: comment("c1") }, "internal-id", arg),
    );
    const second = prsReducer(
      first,
      postPrComment.fulfilled({ key, comment: comment("c2") }, "internal-id", arg),
    );
    expect(second.comments[key]?.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("purges all repo-scoped state on removeRepo.fulfilled", () => {
    let state = prsReducer(initial(), setPrs({ repoId: "r1", prs: [pr({ number: 1 })] }));
    const key = detailKey("r1", 1);
    state = prsReducer(
      state,
      loadPrDetail.fulfilled({ key, detail: detail(1) }, "internal-id", {
        repoId: "r1",
        prNumber: 1,
      }),
    );
    const next = prsReducer(state, removeRepo.fulfilled("r1", "internal-id", "r1"));
    expect(next.items["r1"]).toBeUndefined();
    expect(next.detail[key]).toBeUndefined();
  });

  it("purges repo-scoped state on deleteRepo.fulfilled but keeps other repos", () => {
    let state = prsReducer(initial(), setPrs({ repoId: "r1", prs: [pr({ number: 1 })] }));
    state = prsReducer(state, setPrs({ repoId: "r2", prs: [pr({ number: 2 })] }));
    const next = prsReducer(state, deleteRepo.fulfilled("r1", "internal-id", "r1"));
    expect(next.items["r1"]).toBeUndefined();
    expect(next.items["r2"]).toBeDefined();
  });
});
