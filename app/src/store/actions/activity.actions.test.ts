import { configureStore } from "@reduxjs/toolkit";

import type { ListCommitsSummary } from "@recrest/shared";
import { TauriCommand } from "@recrest/shared";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchCommitsRange, fetchOldestCommitDate } from "@/store/actions/activity.actions";
import { activityReducer } from "@/store/reducers/activityReducer";
import { reposReducer } from "@/store/reducers/reposReducer";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/lib/tauri", () => ({
  invoke: invokeMock,
  isTauri: () => false,
}));

// A minimal store with only the slices the activity thunk reads (`repos`,
// `activity`). `fetchCommitsRange` consults both via `getState`. The thunk is
// typed `{ state: RootState }`; this store's state is a structural subset, so
// we widen the dispatch type to accept the thunk action.
function makeStore() {
  const store = configureStore({
    reducer: { repos: reposReducer, activity: activityReducer },
  });
  return store as Omit<typeof store, "dispatch"> & {
    dispatch: typeof store.dispatch &
      ((action: unknown) => Promise<{ type: string; payload: unknown }>);
  };
}

const RANGE = { since: "2026-01-01T00:00:00.000Z", until: "2026-02-01T00:00:00.000Z" };

describe("fetchCommitsRange thunk", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("returns null without invoking when every known repo already covers the range", async () => {
    // Seed a repo whose loaded range fully covers the requested range, then
    // mark the fetch fulfilled so commitsByRepo records that coverage. A
    // re-fetch of the same range then has no gap and no unloaded repo → null.
    const store = makeStore();
    store.dispatch({
      type: "repos/upsertRepo",
      payload: { id: "repo-1", name: "Repo One", path: "/tmp/repo-1" },
    });
    store.dispatch(fetchCommitsRange.pending("seed", { range: RANGE, requestId: "seed" }));
    store.dispatch(
      fetchCommitsRange.fulfilled(
        { requestId: "seed", totals: { "repo-1": 0 }, truncated: { "repo-1": false } },
        "seed",
        { range: RANGE, requestId: "seed" },
      ),
    );
    invokeMock.mockClear();

    const result = await store.dispatch(fetchCommitsRange({ range: RANGE, requestId: "req-1" }));
    expect(result.payload).toBeNull();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("invokes list_commits with the planned window when a repo is unloaded", async () => {
    const summary: ListCommitsSummary = {
      requestId: "req-2",
      totals: { "repo-1": 3 },
      truncated: { "repo-1": false },
    };
    invokeMock.mockResolvedValueOnce(summary);

    const store = makeStore();
    // Seed a known repo so planFetchWindow sees an unloaded repo and walks it.
    store.dispatch({
      type: "repos/upsertRepo",
      payload: { id: "repo-1", name: "Repo One", path: "/tmp/repo-1" },
    });

    const result = await store.dispatch(fetchCommitsRange({ range: RANGE, requestId: "req-2" }));

    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.LIST_COMMITS, {
      requestId: "req-2",
      since: RANGE.since,
      until: RANGE.until,
    });
    expect(result.payload).toEqual(summary);
  });

  it("rejects when invoke throws", async () => {
    invokeMock.mockRejectedValueOnce(new Error("ipc down"));
    const store = makeStore();
    store.dispatch({
      type: "repos/upsertRepo",
      payload: { id: "repo-1", name: "Repo One", path: "/tmp/repo-1" },
    });

    const result = await store.dispatch(fetchCommitsRange({ range: RANGE, requestId: "req-3" }));
    expect(result.type).toBe(fetchCommitsRange.rejected.type);
  });
});

describe("fetchOldestCommitDate thunk", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves with the oldest commit date from invoke", async () => {
    invokeMock.mockResolvedValueOnce("2020-05-01T00:00:00.000Z");
    const store = makeStore();
    const result = await store.dispatch(fetchOldestCommitDate());
    expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GET_OLDEST_COMMIT_DATE, {});
    expect(result.payload).toBe("2020-05-01T00:00:00.000Z");
  });

  it("resolves with null when there are no commits", async () => {
    invokeMock.mockResolvedValueOnce(null);
    const store = makeStore();
    const result = await store.dispatch(fetchOldestCommitDate());
    expect(result.payload).toBeNull();
  });
});
