import type { ReactNode } from "react";

import { Provider as ReduxProvider } from "react-redux";

import type { Store } from "@reduxjs/toolkit";

import type {
  RepoRemovedEventPayload,
  RepoStatusEventPayload,
  Repository,
  RepositoryStatus,
} from "@recrest/shared";
import { REPO_REMOVED_EVENT, REPO_STATUS_EVENT, TauriCommand } from "@recrest/shared";

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetUnknownRepoReloadThrottle, useRepos } from "@/hooks/useRepos";
import type { RootState } from "@/store";
import { makeTestStore } from "@/test/utils";

const listeners = new Map<string, (event: { payload: unknown }) => void>();
const unlisten = vi.fn();
const invoke = vi.fn();

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  invoke: (command: string, args?: Record<string, unknown>) => invoke(command, args),
  listen: (event: string, handler: (e: { payload: unknown }) => void) => {
    listeners.set(event, handler);
    return Promise.resolve(unlisten);
  },
}));

function makeStatus(overrides: Partial<RepositoryStatus> = {}): RepositoryStatus {
  return {
    branch: "main",
    head: "abc123",
    ahead: 0,
    behind: 0,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0,
    dirty: false,
    lastCommit: null,
    remoteUrl: null,
    changedFiles: [],
    changedFilesTruncated: false,
    commitActivity: [],
    addedLines: 0,
    removedLines: 0,
    language: null,
    languages: null,
    ...overrides,
  };
}

function makeRepo(overrides: Partial<Repository> & Pick<Repository, "id">): Repository {
  return {
    name: "Repo",
    path: `/repos/${overrides.id}`,
    groupId: null,
    remoteUrl: null,
    providerId: null,
    status: makeStatus(),
    logoPath: null,
    logoDarkPath: null,
    sshKeyPath: null,
    ...overrides,
  };
}

function wrapper(store: Store<RootState>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ReduxProvider store={store}>{children}</ReduxProvider>
  );
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

/** Mount the hook and wait until both event subscriptions are live. */
async function mountRepos(store: Store<RootState>) {
  const rendered = renderHook(() => useRepos(), { wrapper: wrapper(store) });
  await waitFor(() => {
    expect(listeners.has(REPO_STATUS_EVENT)).toBe(true);
    expect(listeners.has(REPO_REMOVED_EVENT)).toBe(true);
  });
  return rendered;
}

async function emit(event: string, payload: unknown) {
  await act(async () => {
    listeners.get(event)?.({ payload });
    await Promise.resolve();
  });
}

function countListCalls() {
  return invoke.mock.calls.filter(([command]) => command === TauriCommand.LIST_REPOS).length;
}

const MISSING_REPO_ID = "r-missing";

function storeWithRepo(overrides: Partial<Repository> = {}) {
  const repo = makeRepo({ id: MISSING_REPO_ID, missing: true, ...overrides });
  return makeTestStore({ repos: { items: { [repo.id]: repo } } });
}

describe("useRepos", () => {
  beforeEach(() => {
    listeners.clear();
    unlisten.mockClear();
    resetUnknownRepoReloadThrottle();
    // The mount effect always fires `list_repos`; rejecting keeps the preloaded
    // fixtures in place so each assertion sees only the event under test.
    invoke.mockReset();
    invoke.mockRejectedValue(new Error("ipc disabled in test"));
  });

  it("clears the missing flag when a status event proves the repo is readable again", async () => {
    const store = storeWithRepo();
    await mountRepos(store);
    expect(store.getState().repos.items[MISSING_REPO_ID]?.missing).toBe(true);

    const payload: RepoStatusEventPayload = {
      repoId: MISSING_REPO_ID,
      status: makeStatus({ branch: "feature/back" }),
    };
    await emit(REPO_STATUS_EVENT, payload);

    expect(store.getState().repos.items[MISSING_REPO_ID]?.missing).toBeFalsy();
    expect(store.getState().repos.items[MISSING_REPO_ID]?.status.branch).toBe("feature/back");
  });

  it("refetches the list once for a burst of events about an unknown repo", async () => {
    const store = makeTestStore();
    await mountRepos(store);
    const afterMount = countListCalls();

    const payload: RepoStatusEventPayload = { repoId: "not-in-store", status: makeStatus() };
    await emit(REPO_STATUS_EVENT, payload);
    await emit(REPO_STATUS_EVENT, payload);

    expect(countListCalls()).toBe(afterMount + 1);
    // The unknown repo must not be invented from the event payload — only a
    // real `list_repos` response may introduce a row.
    expect(store.getState().repos.items["not-in-store"]).toBeUndefined();
  });

  it("drops the row when repo://removed reports the record was forgotten", async () => {
    const store = storeWithRepo({ missing: false });
    await mountRepos(store);

    const payload: RepoRemovedEventPayload = { repoId: MISSING_REPO_ID, forgotten: true };
    await emit(REPO_REMOVED_EVENT, payload);

    expect(store.getState().repos.items[MISSING_REPO_ID]).toBeUndefined();
  });

  it("flags the row when repo://removed kept the record", async () => {
    const store = storeWithRepo({ missing: false });
    await mountRepos(store);

    const payload: RepoRemovedEventPayload = { repoId: MISSING_REPO_ID, forgotten: false };
    await emit(REPO_REMOVED_EVENT, payload);

    expect(store.getState().repos.items[MISSING_REPO_ID]?.missing).toBe(true);
  });

  it("unsubscribes both channels on unmount", async () => {
    const store = makeTestStore();
    const { unmount } = await mountRepos(store);

    unmount();

    expect(unlisten).toHaveBeenCalledTimes(2);
  });
});
