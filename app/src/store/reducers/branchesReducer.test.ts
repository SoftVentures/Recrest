import type { BranchInfo } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { loadBranches } from "@/store/actions/branches.actions";
import {
  deleteRepo,
  forgetReposUnderPath,
  removeRepo,
  repoRemoved,
} from "@/store/actions/repos.actions";
import { branchesReducer } from "@/store/reducers/branchesReducer";
import type { BranchesState } from "@/store/types/branches.types";

const initial = (): BranchesState => branchesReducer(undefined, { type: "@@INIT" });

function branch(name: string): BranchInfo {
  return {
    name,
    isCurrent: name === "main",
    isRemote: false,
    remote: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    clean: true,
    lastCommit: null,
  };
}

function withBranches(repoIds: string[]): BranchesState {
  let state = initial();
  for (const repoId of repoIds) {
    state = branchesReducer(
      state,
      loadBranches.fulfilled({ repoId, branches: [branch("main")] }, "internal-id", repoId),
    );
  }
  return state;
}

describe("branchesReducer", () => {
  it("caches a repo's branches and clears its loading flag", () => {
    const pending = branchesReducer(initial(), loadBranches.pending("internal-id", "r1"));
    expect(pending.loadingRepoIds).toEqual(["r1"]);

    const next = branchesReducer(
      pending,
      loadBranches.fulfilled({ repoId: "r1", branches: [branch("main")] }, "internal-id", "r1"),
    );

    expect(next.byRepoId["r1"]?.map((b) => b.name)).toEqual(["main"]);
    expect(next.loadingRepoIds).toEqual([]);
  });

  it("evicts a removed repo's branches", () => {
    const next = branchesReducer(
      withBranches(["r1", "r2"]),
      removeRepo.fulfilled("r1", "internal-id", "r1"),
    );
    expect(next.byRepoId["r1"]).toBeUndefined();
    expect(next.byRepoId["r2"]).toBeDefined();
  });

  it("evicts a deleted repo's branches", () => {
    const next = branchesReducer(
      withBranches(["r1"]),
      deleteRepo.fulfilled("r1", "internal-id", { repoId: "r1" }),
    );
    expect(next.byRepoId["r1"]).toBeUndefined();
  });

  it("evicts every repo forgotten with a removed scan root", () => {
    const next = branchesReducer(
      withBranches(["r1", "r2", "r3"]),
      forgetReposUnderPath.fulfilled(["r1", "r3"], "internal-id", {
        removedPath: "/dev",
        remainingPaths: [],
      }),
    );
    expect(Object.keys(next.byRepoId)).toEqual(["r2"]);
  });

  it("evicts a repo the watcher reports as forgotten", () => {
    // `repo://removed` reaches no thunk, so the cached branch list survived the
    // repo it belonged to for the rest of the session.
    let state = withBranches(["r1"]);
    state = branchesReducer(state, loadBranches.pending("internal-id", "r1"));

    const next = branchesReducer(state, repoRemoved({ repoId: "r1", forgotten: true }));

    expect(next.byRepoId["r1"]).toBeUndefined();
    expect(next.loadingRepoIds).toEqual([]);
  });

  it("keeps the branches of a repo whose record was kept, only flagged missing", () => {
    const next = branchesReducer(
      withBranches(["r1"]),
      repoRemoved({ repoId: "r1", forgotten: false }),
    );
    expect(next.byRepoId["r1"]).toBeDefined();
  });
});
