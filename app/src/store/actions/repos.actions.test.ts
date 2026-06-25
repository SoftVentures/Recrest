import { configureStore } from "@reduxjs/toolkit";

import type { GitMergeResult, Repository, RepositoryStatus } from "@recrest/shared";
import { TauriCommand } from "@recrest/shared";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addRepo,
  deleteRepo,
  forgetReposUnderPath,
  gitBranchCreate,
  gitCloneUrl,
  gitDiscard,
  gitFetch,
  gitMerge,
  gitStash,
  loadGitConfigLayers,
  removeRepo,
  setRepoSshKey,
} from "@/store/actions/repos.actions";
import { reposReducer } from "@/store/reducers/reposReducer";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/lib/tauri", () => ({
  invoke: invokeMock,
  isTauri: () => false,
}));

function makeStore() {
  return configureStore({ reducer: { repos: reposReducer } });
}

const REPO = "repo-1";
const repository = { id: REPO, name: "Repo One" } as unknown as Repository;
const status = { branch: "main" } as unknown as RepositoryStatus;

describe("repos thunks", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("addRepo coalesces a missing groupId to null", async () => {
    invokeMock.mockResolvedValueOnce(repository);
    const store = makeStore();
    const result = await store.dispatch(addRepo({ path: "/tmp/repo" }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.ADD_REPO, {
      path: "/tmp/repo",
      groupId: null,
    });
    expect(result.payload).toEqual(repository);
  });

  it("addRepo forwards an explicit groupId", async () => {
    invokeMock.mockResolvedValueOnce(repository);
    const store = makeStore();
    await store.dispatch(addRepo({ path: "/tmp/repo", groupId: "grp-1" }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.ADD_REPO, {
      path: "/tmp/repo",
      groupId: "grp-1",
    });
  });

  it("removeRepo resolves with the repo id after the void invoke", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    const store = makeStore();
    const result = await store.dispatch(removeRepo(REPO));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.REMOVE_REPO, { repoId: REPO });
    expect(result.payload).toBe(REPO);
  });

  it("deleteRepo resolves with the repo id after the void invoke (trash by default)", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    const store = makeStore();
    const result = await store.dispatch(deleteRepo({ repoId: REPO }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.DELETE_REPO, {
      repoId: REPO,
      permanent: false,
    });
    expect(result.payload).toBe(REPO);
  });

  it("deleteRepo passes permanent: true for the irreversible fallback", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    const store = makeStore();
    await store.dispatch(deleteRepo({ repoId: REPO, permanent: true }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.DELETE_REPO, {
      repoId: REPO,
      permanent: true,
    });
  });

  it("setRepoSshKey writes the key then re-reads status", async () => {
    invokeMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(repository);
    const store = makeStore();
    const result = await store.dispatch(setRepoSshKey({ repoId: REPO, keyPath: "/k.pem" }));
    expect(invokeMock).toHaveBeenNthCalledWith(1, TauriCommand.SET_REPO_SSH_KEY, {
      repoId: REPO,
      keyPath: "/k.pem",
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, TauriCommand.REPO_STATUS, { repoId: REPO });
    expect(result.payload).toEqual(repository);
  });

  it("gitFetch echoes the repo id with the returned status", async () => {
    invokeMock.mockResolvedValueOnce(status);
    const store = makeStore();
    const result = await store.dispatch(gitFetch(REPO));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GIT_FETCH, { repoId: REPO });
    expect(result.payload).toEqual({ repoId: REPO, status });
  });

  it("gitBranchCreate coalesces a missing from to null", async () => {
    invokeMock.mockResolvedValueOnce(status);
    const store = makeStore();
    await store.dispatch(gitBranchCreate({ repoId: REPO, name: "feat", checkout: true }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GIT_BRANCH_CREATE, {
      repoId: REPO,
      name: "feat",
      from: null,
      checkout: true,
    });
  });

  it("gitMerge coalesces missing target and message to null", async () => {
    const merge = { conflicts: [] } as unknown as GitMergeResult;
    invokeMock.mockResolvedValueOnce(merge);
    const store = makeStore();
    const result = await store.dispatch(gitMerge({ repoId: REPO, source: "feat" }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GIT_MERGE, {
      repoId: REPO,
      source: "feat",
      target: null,
      message: null,
    });
    expect(result.payload).toEqual({ repoId: REPO, result: merge });
  });

  it("gitCloneUrl coalesces a missing subFolder to null", async () => {
    invokeMock.mockResolvedValueOnce(repository);
    const store = makeStore();
    await store.dispatch(gitCloneUrl({ url: "git@x", destination: "/dest" }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GIT_CLONE, {
      url: "git@x",
      destination: "/dest",
      subFolder: null,
    });
  });

  it("gitDiscard defaults force to false", async () => {
    invokeMock.mockResolvedValueOnce({ discarded: [] });
    const store = makeStore();
    await store.dispatch(gitDiscard({ repoId: REPO, paths: ["a"] }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GIT_DISCARD, {
      repoId: REPO,
      paths: ["a"],
      force: false,
    });
  });

  it("gitStash coalesces a missing message to null", async () => {
    invokeMock.mockResolvedValueOnce(status);
    const store = makeStore();
    await store.dispatch(gitStash({ repoId: REPO }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GIT_STASH, {
      repoId: REPO,
      message: null,
    });
  });

  it("forgetReposUnderPath forwards removed/remaining paths", async () => {
    invokeMock.mockResolvedValueOnce([REPO]);
    const store = makeStore();
    const result = await store.dispatch(
      forgetReposUnderPath({ removedPath: "/a", remainingPaths: ["/b"] }),
    );
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.FORGET_REPOS_UNDER_PATH, {
      removedPath: "/a",
      remainingPaths: ["/b"],
    });
    expect(result.payload).toEqual([REPO]);
  });

  it("loadGitConfigLayers passes a null repoId through", async () => {
    invokeMock.mockResolvedValueOnce([]);
    const store = makeStore();
    await store.dispatch(loadGitConfigLayers({ repoId: null }));
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.LIST_GIT_CONFIG_LAYERS, { repoId: null });
  });

  it("rejects when invoke throws", async () => {
    invokeMock.mockRejectedValueOnce(new Error("boom"));
    const store = makeStore();
    const result = await store.dispatch(gitFetch(REPO));
    expect(result.type).toBe(gitFetch.rejected.type);
  });
});
