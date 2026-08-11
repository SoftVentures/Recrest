import type {
  AppSettings,
  DiscardResult,
  GitMergeResult,
  Repository,
  RepositoryGroup,
  RepositoryStatus,
} from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  addRepo,
  backgroundScanForRepos,
  clearRepoLogo,
  deleteRepo,
  forgetReposUnderPath,
  gitBranchCreate,
  gitCheckout,
  gitCloneUrl,
  gitCommit,
  gitDiscard,
  gitFetch,
  gitMerge,
  gitPull,
  gitPush,
  gitStage,
  gitStash,
  gitStashDrop,
  gitStashPop,
  gitUnstage,
  loadRepos,
  refreshRepoStatus,
  removeRepo,
  repoRemoved,
  scanForRepos,
  setGroups,
  setRepoLogo,
  setRepoSshKey,
  setScanPaths,
  upsertRepo,
} from "@/store/actions/repos.actions";
import { loadSettings, saveSettings } from "@/store/actions/settings.actions";
import { reposReducer } from "@/store/reducers/reposReducer";
import type { ReposState } from "@/store/types/repos.types";

const initial = (): ReposState => reposReducer(undefined, { type: "@@INIT" });

function status(overrides: Partial<RepositoryStatus> = {}): RepositoryStatus {
  return {
    branch: overrides.branch ?? "main",
    head: overrides.head ?? "abc123",
    ahead: overrides.ahead ?? 0,
    behind: overrides.behind ?? 0,
    staged: overrides.staged ?? 0,
    unstaged: overrides.unstaged ?? 0,
    untracked: overrides.untracked ?? 0,
    conflicted: overrides.conflicted ?? 0,
    dirty: overrides.dirty ?? false,
    lastCommit: overrides.lastCommit ?? null,
    remoteUrl: overrides.remoteUrl ?? null,
    changedFiles: overrides.changedFiles ?? [],
    changedFilesTruncated: overrides.changedFilesTruncated ?? false,
    commitActivity: overrides.commitActivity ?? [],
    addedLines: overrides.addedLines ?? 0,
    removedLines: overrides.removedLines ?? 0,
    language: overrides.language ?? null,
    languages: overrides.languages ?? null,
  };
}

function repo(overrides: Partial<Repository> & Pick<Repository, "id">): Repository {
  return {
    id: overrides.id,
    name: overrides.name ?? "Repo",
    path: overrides.path ?? `/repos/${overrides.id}`,
    groupId: overrides.groupId ?? null,
    remoteUrl: overrides.remoteUrl ?? null,
    providerId: overrides.providerId ?? null,
    status: overrides.status ?? status(),
    logoPath: overrides.logoPath ?? null,
    logoDarkPath: overrides.logoDarkPath ?? null,
    sshKeyPath: overrides.sshKeyPath ?? null,
  };
}

const withRepo = (r: Repository): ReposState => reposReducer(initial(), upsertRepo(r));

describe("reposReducer", () => {
  it("sets scan paths", () => {
    const next = reposReducer(initial(), setScanPaths(["/a", "/b"]));
    expect(next.scanPaths).toEqual(["/a", "/b"]);
  });

  it("mirrors scan paths from loadSettings.fulfilled", () => {
    const payload = { scanPaths: ["/x"] } as unknown as AppSettings;
    const next = reposReducer(initial(), loadSettings.fulfilled(payload, "internal-id", undefined));
    expect(next.scanPaths).toEqual(["/x"]);
  });

  it("mirrors scan paths from saveSettings.fulfilled", () => {
    const payload = { scanPaths: ["/y"] } as unknown as AppSettings;
    const next = reposReducer(
      initial(),
      saveSettings.fulfilled(payload, "internal-id", {}, { seq: 1 }),
    );
    expect(next.scanPaths).toEqual(["/y"]);
  });

  it("ignores a superseded saveSettings snapshot", () => {
    // Concurrent `update_settings` responses complete out of order; the older
    // one must not restore the scan root the user just removed.
    const newest = { scanPaths: ["/a", "/b"] } as unknown as AppSettings;
    const stale = { scanPaths: ["/a"] } as unknown as AppSettings;

    let state = reposReducer(initial(), saveSettings.fulfilled(newest, "id-2", {}, { seq: 2 }));
    state = reposReducer(state, saveSettings.fulfilled(stale, "id-1", {}, { seq: 1 }));

    expect(state.scanPaths).toEqual(["/a", "/b"]);
  });

  it("upserts a repo keyed by id", () => {
    const next = withRepo(repo({ id: "r1", name: "One" }));
    expect(next.items["r1"]?.name).toBe("One");
  });

  it("sets groups", () => {
    const groups: Record<string, RepositoryGroup> = {
      g1: { id: "g1", name: "Group", color: "#fff" },
    };
    const next = reposReducer(initial(), setGroups(groups));
    expect(next.groups["g1"]?.name).toBe("Group");
  });

  it("sets loading on scanForRepos.pending", () => {
    const next = reposReducer(initial(), scanForRepos.pending("internal-id", []));
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it("replaces items wholesale on scanForRepos.fulfilled", () => {
    const start = withRepo(repo({ id: "old" }));
    const next = reposReducer(
      start,
      scanForRepos.fulfilled([repo({ id: "new" })], "internal-id", []),
    );
    expect(Object.keys(next.items)).toEqual(["new"]);
    expect(next.loading).toBe(false);
  });

  it("records the error on scanForRepos.rejected", () => {
    const next = reposReducer(
      initial(),
      scanForRepos.rejected(new Error("scan boom"), "internal-id", []),
    );
    expect(next.error).toBe("scan boom");
  });

  it("replaces items on backgroundScanForRepos.fulfilled without touching chrome state", () => {
    const start = withRepo(repo({ id: "old" }));
    const pending = reposReducer(start, backgroundScanForRepos.pending("internal-id", ["/dev"]));
    // The header refresh indicator reads `loading` — an unattended scan must
    // never make it spin.
    expect(pending.loading).toBe(false);
    const next = reposReducer(
      pending,
      backgroundScanForRepos.fulfilled([repo({ id: "new" })], "internal-id", ["/dev"]),
    );
    expect(Object.keys(next.items)).toEqual(["new"]);
    expect(next.loading).toBe(false);
  });

  it("keeps the error banner clear when a background rescan fails", () => {
    const next = reposReducer(
      initial(),
      backgroundScanForRepos.rejected(new Error("scan boom"), "internal-id", ["/dev"]),
    );
    expect(next.error).toBeNull();
    expect(next.loading).toBe(false);
  });

  it("sets loading on loadRepos.pending and replaces items on fulfilled", () => {
    const pending = reposReducer(initial(), loadRepos.pending("internal-id", undefined));
    expect(pending.loading).toBe(true);
    const next = reposReducer(
      pending,
      loadRepos.fulfilled([repo({ id: "a" }), repo({ id: "b" })], "internal-id", undefined),
    );
    expect(Object.keys(next.items).sort()).toEqual(["a", "b"]);
  });

  it("records the error on loadRepos.rejected", () => {
    const next = reposReducer(
      initial(),
      loadRepos.rejected(new Error("load boom"), "internal-id", undefined),
    );
    expect(next.error).toBe("load boom");
  });

  it("replaces a single repo on refreshRepoStatus.fulfilled", () => {
    const start = withRepo(repo({ id: "r1", name: "Stale" }));
    const next = reposReducer(
      start,
      refreshRepoStatus.fulfilled(repo({ id: "r1", name: "Fresh" }), "internal-id", "r1"),
    );
    expect(next.items["r1"]?.name).toBe("Fresh");
  });

  it("replaces the repo on setRepoSshKey.fulfilled", () => {
    const start = withRepo(repo({ id: "r1" }));
    const next = reposReducer(
      start,
      setRepoSshKey.fulfilled(repo({ id: "r1", sshKeyPath: "/key" }), "internal-id", {
        repoId: "r1",
        keyPath: "/key",
      }),
    );
    expect(next.items["r1"]?.sshKeyPath).toBe("/key");
  });

  it("replaces the repo on setRepoLogo.fulfilled and clearRepoLogo.fulfilled", () => {
    const start = withRepo(repo({ id: "r1" }));
    const withLogo = reposReducer(
      start,
      setRepoLogo.fulfilled(repo({ id: "r1", logoPath: "/logo.png" }), "internal-id", {
        repoId: "r1",
        sourcePath: "/src.png",
      }),
    );
    expect(withLogo.items["r1"]?.logoPath).toBe("/logo.png");
    const cleared = reposReducer(
      withLogo,
      clearRepoLogo.fulfilled(repo({ id: "r1", logoPath: null }), "internal-id", "r1"),
    );
    expect(cleared.items["r1"]?.logoPath).toBeNull();
  });

  it("adds a repo on addRepo.fulfilled", () => {
    const next = reposReducer(
      initial(),
      addRepo.fulfilled(repo({ id: "added" }), "internal-id", { path: "/p" }),
    );
    expect(next.items["added"]).toBeDefined();
  });

  it("removes a repo on removeRepo.fulfilled", () => {
    const start = withRepo(repo({ id: "r1" }));
    const next = reposReducer(start, removeRepo.fulfilled("r1", "internal-id", "r1"));
    expect(next.items["r1"]).toBeUndefined();
  });

  it("prunes repos on forgetReposUnderPath.fulfilled", () => {
    let state = withRepo(repo({ id: "a" }));
    state = reposReducer(state, upsertRepo(repo({ id: "b" })));
    const next = reposReducer(
      state,
      forgetReposUnderPath.fulfilled(["a"], "internal-id", {
        removedPath: "/root",
        remainingPaths: [],
      }),
    );
    expect(next.items["a"]).toBeUndefined();
    expect(next.items["b"]).toBeDefined();
  });

  it("tolerates a null payload on forgetReposUnderPath.fulfilled", () => {
    const start = withRepo(repo({ id: "a" }));
    const next = reposReducer(
      start,
      forgetReposUnderPath.fulfilled(null as unknown as string[], "internal-id", {
        removedPath: "/root",
        remainingPaths: [],
      }),
    );
    expect(next.items["a"]).toBeDefined();
  });

  it("removes a repo on deleteRepo.fulfilled", () => {
    const start = withRepo(repo({ id: "r1" }));
    const next = reposReducer(start, deleteRepo.fulfilled("r1", "internal-id", { repoId: "r1" }));
    expect(next.items["r1"]).toBeUndefined();
  });

  it("drops the repo on repoRemoved when the record was forgotten", () => {
    let state = withRepo(repo({ id: "gone" }));
    state = reposReducer(state, upsertRepo(repo({ id: "kept" })));
    const next = reposReducer(state, repoRemoved({ repoId: "gone", forgotten: true }));
    expect(next.items["gone"]).toBeUndefined();
    expect(next.items["kept"]).toBeDefined();
  });

  it("flags the repo as missing on repoRemoved when the record was kept", () => {
    const start = withRepo(repo({ id: "r1" }));
    const next = reposReducer(start, repoRemoved({ repoId: "r1", forgotten: false }));
    expect(next.items["r1"]).toBeDefined();
    expect(next.items["r1"]?.missing).toBe(true);
  });

  it("ignores repoRemoved for an unknown repo", () => {
    const next = reposReducer(initial(), repoRemoved({ repoId: "ghost", forgotten: false }));
    expect(next.items["ghost"]).toBeUndefined();
  });

  it("updates repo.status from a direct-status git action (gitFetch)", () => {
    const start = withRepo(repo({ id: "r1", status: status({ ahead: 0 }) }));
    const next = reposReducer(
      start,
      gitFetch.fulfilled({ repoId: "r1", status: status({ ahead: 3 }) }, "internal-id", "r1"),
    );
    expect(next.items["r1"]?.status.ahead).toBe(3);
  });

  it("ignores a direct-status git action for an unknown repo", () => {
    const next = reposReducer(
      initial(),
      gitPull.fulfilled({ repoId: "ghost", status: status() }, "internal-id", "ghost"),
    );
    expect(next.items["ghost"]).toBeUndefined();
  });

  it("updates repo.status across the other direct-status git actions", () => {
    const start = withRepo(repo({ id: "r1" }));
    const arg = { repoId: "r1" };
    const flows = [
      reposReducer(
        start,
        gitPush.fulfilled({ repoId: "r1", status: status({ behind: 1 }) }, "i", "r1"),
      ),
      reposReducer(
        start,
        gitCheckout.fulfilled({ repoId: "r1", status: status({ branch: "dev" }) }, "i", {
          ...arg,
          branch: "dev",
        }),
      ),
      reposReducer(
        start,
        gitBranchCreate.fulfilled({ repoId: "r1", status: status({ branch: "feat" }) }, "i", {
          ...arg,
          name: "feat",
          checkout: true,
        }),
      ),
      reposReducer(
        start,
        gitStage.fulfilled({ repoId: "r1", status: status({ staged: 2 }) }, "i", {
          ...arg,
          paths: ["a"],
        }),
      ),
      reposReducer(
        start,
        gitUnstage.fulfilled({ repoId: "r1", status: status({ staged: 0 }) }, "i", {
          ...arg,
          paths: ["a"],
        }),
      ),
      reposReducer(
        start,
        gitStash.fulfilled({ repoId: "r1", status: status({ dirty: false }) }, "i", arg),
      ),
      reposReducer(
        start,
        gitStashPop.fulfilled({ repoId: "r1", status: status({ dirty: true }) }, "i", {
          ...arg,
          index: 0,
        }),
      ),
      reposReducer(
        start,
        gitStashDrop.fulfilled({ repoId: "r1", status: status() }, "i", { ...arg, index: 0 }),
      ),
      reposReducer(
        start,
        gitCommit.fulfilled({ repoId: "r1", status: status({ staged: 0 }) }, "i", {
          ...arg,
          message: "m",
        }),
      ),
    ];
    for (const s of flows) {
      expect(s.items["r1"]).toBeDefined();
    }
    expect(flows[0]?.items["r1"]?.status.behind).toBe(1);
    expect(flows[1]?.items["r1"]?.status.branch).toBe("dev");
  });

  it("updates repo.status from gitMerge.fulfilled via result.status", () => {
    const start = withRepo(repo({ id: "r1" }));
    const result: GitMergeResult = {
      status: status({ ahead: 5 }),
      state: "merged",
      conflicts: [],
    };
    const next = reposReducer(
      start,
      gitMerge.fulfilled({ repoId: "r1", result }, "internal-id", { repoId: "r1", source: "dev" }),
    );
    expect(next.items["r1"]?.status.ahead).toBe(5);
  });

  it("updates repo.status from gitDiscard.fulfilled via result.status", () => {
    const start = withRepo(repo({ id: "r1", status: status({ dirty: true }) }));
    const result: DiscardResult = {
      discarded: ["a"],
      requiresConfirmation: [],
      status: status({ dirty: false }),
    };
    const next = reposReducer(
      start,
      gitDiscard.fulfilled({ repoId: "r1", result }, "internal-id", {
        repoId: "r1",
        paths: ["a"],
      }),
    );
    expect(next.items["r1"]?.status.dirty).toBe(false);
  });

  it("adds the cloned repo on gitCloneUrl.fulfilled", () => {
    const next = reposReducer(
      initial(),
      gitCloneUrl.fulfilled(repo({ id: "cloned" }), "internal-id", {
        url: "u",
        destination: "/d",
      }),
    );
    expect(next.items["cloned"]).toBeDefined();
  });
});
