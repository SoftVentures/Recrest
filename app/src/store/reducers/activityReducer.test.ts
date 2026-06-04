import type { ActivityRange, CommitsChunkPayload, RecentCommit } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import type { RootState } from "@/store";
import {
  commitsChunkReceived,
  fetchCommitsRange,
  fetchOldestCommitDate,
  setSelectedRange,
} from "@/store/actions/activity.actions";
import { activityReducer, initialActivityState } from "@/store/reducers/activityReducer";
import { selectCommitsInRange } from "@/store/selectors/activity.selectors";
import type { ActivityState } from "@/store/types/activity.types";

const RANGE: ActivityRange = {
  since: "2026-01-01T00:00:00.000Z",
  until: "2026-02-01T00:00:00.000Z",
};

function commit(overrides: Partial<RecentCommit> & Pick<RecentCommit, "sha">): RecentCommit {
  return {
    sha: overrides.sha,
    summary: overrides.summary ?? "summary",
    author: overrides.author ?? "Alice",
    authorEmail: overrides.authorEmail ?? null,
    timestamp: overrides.timestamp ?? "2026-01-15T00:00:00.000Z",
    repoId: overrides.repoId ?? "repo-1",
    repoName: overrides.repoName ?? "Repo One",
  };
}

function chunk(overrides: Partial<CommitsChunkPayload>): CommitsChunkPayload {
  return {
    requestId: overrides.requestId ?? "req-1",
    repoId: overrides.repoId ?? "repo-1",
    commits: overrides.commits ?? [],
    done: overrides.done ?? false,
    truncated: overrides.truncated ?? false,
  };
}

const pending = (requestId: string, range: ActivityRange = RANGE) =>
  fetchCommitsRange.pending("internal-id", { range, requestId });

describe("activityReducer", () => {
  it("stores the selected range", () => {
    const next = activityReducer(initialActivityState, setSelectedRange(RANGE));
    expect(next.selectedRange).toEqual(RANGE);
  });

  it("ignores a value-equal selected range and keeps the same reference", () => {
    const start = activityReducer(initialActivityState, setSelectedRange(RANGE));
    const next = activityReducer(
      start,
      setSelectedRange({ since: RANGE.since, until: RANGE.until }),
    );
    expect(next.selectedRange).toBe(start.selectedRange);
  });

  it("marks the active request id on pending", () => {
    const next = activityReducer(initialActivityState, pending("req-1"));
    expect(next.activeRequestId).toBe("req-1");
  });

  it("appends commits from a chunk for the active request", () => {
    const afterPending = activityReducer(initialActivityState, pending("req-1"));
    const next = activityReducer(
      afterPending,
      commitsChunkReceived(chunk({ requestId: "req-1", commits: [commit({ sha: "a" })] })),
    );
    expect(next.commitsByRepo["repo-1"]?.commits.map((c) => c.sha)).toEqual(["a"]);
  });

  it("drops chunks from a stale request", () => {
    const afterPending = activityReducer(initialActivityState, pending("req-1"));
    const next = activityReducer(
      afterPending,
      commitsChunkReceived(chunk({ requestId: "stale", commits: [commit({ sha: "a" })] })),
    );
    expect(next.commitsByRepo["repo-1"]).toBeUndefined();
  });

  it("dedupes commits by sha across chunks", () => {
    let state: ActivityState = activityReducer(initialActivityState, pending("req-1"));
    state = activityReducer(
      state,
      commitsChunkReceived(
        chunk({ requestId: "req-1", commits: [commit({ sha: "a" }), commit({ sha: "b" })] }),
      ),
    );
    state = activityReducer(
      state,
      commitsChunkReceived(
        chunk({ requestId: "req-1", commits: [commit({ sha: "b" }), commit({ sha: "c" })] }),
      ),
    );
    expect(state.commitsByRepo["repo-1"]?.commits.map((c) => c.sha)).toEqual(["a", "b", "c"]);
  });

  it("sets repo.truncated when a chunk is truncated", () => {
    const afterPending = activityReducer(initialActivityState, pending("req-1"));
    const next = activityReducer(
      afterPending,
      commitsChunkReceived(chunk({ requestId: "req-1", truncated: true })),
    );
    expect(next.commitsByRepo["repo-1"]?.truncated).toBe(true);
  });

  it("only clears the active request id when fulfilled has a null payload", () => {
    const afterPending = activityReducer(initialActivityState, pending("req-1"));
    const next = activityReducer(
      afterPending,
      fetchCommitsRange.fulfilled(null, "internal-id", { range: RANGE, requestId: "req-1" }),
    );
    expect(next.activeRequestId).toBeNull();
    expect(next.commitsByRepo).toEqual({});
  });

  it("sets truncated/status/rangeLoaded from the summary on fulfilled", () => {
    const afterPending = activityReducer(initialActivityState, pending("req-1"));
    const next = activityReducer(
      afterPending,
      fetchCommitsRange.fulfilled(
        { requestId: "req-1", totals: { "repo-1": 3 }, truncated: { "repo-1": true } },
        "internal-id",
        { range: RANGE, requestId: "req-1" },
      ),
    );
    const repo = next.commitsByRepo["repo-1"];
    expect(repo?.status).toBe("idle");
    expect(repo?.truncated).toBe(true);
    expect(repo?.rangeLoaded).toEqual(RANGE);
    expect(next.activeRequestId).toBeNull();
  });

  it("unions the loaded range across successive fulfilled summaries", () => {
    const earlier: ActivityRange = {
      since: "2025-12-01T00:00:00.000Z",
      until: "2026-01-10T00:00:00.000Z",
    };
    let state = activityReducer(initialActivityState, pending("req-1"));
    state = activityReducer(
      state,
      fetchCommitsRange.fulfilled(
        { requestId: "req-1", totals: { "repo-1": 1 }, truncated: { "repo-1": false } },
        "internal-id",
        { range: earlier, requestId: "req-1" },
      ),
    );
    state = activityReducer(state, pending("req-2"));
    state = activityReducer(
      state,
      fetchCommitsRange.fulfilled(
        { requestId: "req-2", totals: { "repo-1": 1 }, truncated: { "repo-1": false } },
        "internal-id",
        { range: RANGE, requestId: "req-2" },
      ),
    );
    expect(state.commitsByRepo["repo-1"]?.rangeLoaded).toEqual({
      since: earlier.since,
      until: RANGE.until,
    });
  });

  it("marks loading repos as error and clears the active request id on rejected", () => {
    let state = activityReducer(initialActivityState, pending("req-1"));
    state = activityReducer(
      state,
      commitsChunkReceived(chunk({ requestId: "req-1", commits: [commit({ sha: "a" })] })),
    );
    expect(state.commitsByRepo["repo-1"]?.status).toBe("loading");
    const next = activityReducer(
      state,
      fetchCommitsRange.rejected(new Error("boom"), "internal-id", {
        range: RANGE,
        requestId: "req-1",
      }),
    );
    expect(next.commitsByRepo["repo-1"]?.status).toBe("error");
    expect(next.activeRequestId).toBeNull();
  });

  it("resets a repo whose loaded range is disjoint from a new pending range", () => {
    let state = activityReducer(initialActivityState, pending("req-1"));
    state = activityReducer(
      state,
      commitsChunkReceived(chunk({ requestId: "req-1", commits: [commit({ sha: "a" })] })),
    );
    state = activityReducer(
      state,
      fetchCommitsRange.fulfilled(
        { requestId: "req-1", totals: { "repo-1": 1 }, truncated: { "repo-1": true } },
        "internal-id",
        { range: RANGE, requestId: "req-1" },
      ),
    );
    expect(state.commitsByRepo["repo-1"]?.commits).toHaveLength(1);

    const disjoint: ActivityRange = {
      since: "2026-06-01T00:00:00.000Z",
      until: "2026-07-01T00:00:00.000Z",
    };
    const next = activityReducer(state, pending("req-2", disjoint));
    const repo = next.commitsByRepo["repo-1"];
    expect(repo?.commits).toEqual([]);
    expect(repo?.rangeLoaded).toBeNull();
    expect(repo?.status).toBe("loading");
    expect(repo?.truncated).toBe(false);
  });

  it("keeps a repo whose loaded range overlaps a new pending range", () => {
    let state = activityReducer(initialActivityState, pending("req-1"));
    state = activityReducer(
      state,
      commitsChunkReceived(chunk({ requestId: "req-1", commits: [commit({ sha: "a" })] })),
    );
    state = activityReducer(
      state,
      fetchCommitsRange.fulfilled(
        { requestId: "req-1", totals: { "repo-1": 1 }, truncated: { "repo-1": false } },
        "internal-id",
        { range: RANGE, requestId: "req-1" },
      ),
    );

    const overlapping: ActivityRange = {
      since: "2026-01-15T00:00:00.000Z",
      until: "2026-03-01T00:00:00.000Z",
    };
    const next = activityReducer(state, pending("req-2", overlapping));
    expect(next.commitsByRepo["repo-1"]?.commits.map((c) => c.sha)).toEqual(["a"]);
    expect(next.commitsByRepo["repo-1"]?.rangeLoaded).toEqual(RANGE);
  });

  it("flips repo status to idle when a chunk reports done", () => {
    const afterPending = activityReducer(initialActivityState, pending("req-1"));
    const next = activityReducer(
      afterPending,
      commitsChunkReceived(
        chunk({ requestId: "req-1", commits: [commit({ sha: "a" })], done: true }),
      ),
    );
    expect(next.commitsByRepo["repo-1"]?.status).toBe("idle");
  });

  it("ignores a stale fulfilled but honours a matching one for activeRequestId", () => {
    let state = activityReducer(initialActivityState, pending("req-2"));
    state = activityReducer(
      state,
      fetchCommitsRange.fulfilled(
        { requestId: "req-1", totals: { "repo-1": 1 }, truncated: { "repo-1": false } },
        "internal-id",
        { range: RANGE, requestId: "req-1" },
      ),
    );
    expect(state.activeRequestId).toBe("req-2");

    state = activityReducer(
      state,
      fetchCommitsRange.fulfilled(
        { requestId: "req-2", totals: { "repo-1": 1 }, truncated: { "repo-1": false } },
        "internal-id",
        { range: RANGE, requestId: "req-2" },
      ),
    );
    expect(state.activeRequestId).toBeNull();
  });

  it("ignores a stale rejected for the active request id", () => {
    let state = activityReducer(initialActivityState, pending("req-2"));
    state = activityReducer(
      state,
      fetchCommitsRange.rejected(new Error("boom"), "internal-id", {
        range: RANGE,
        requestId: "req-1",
      }),
    );
    expect(state.activeRequestId).toBe("req-2");
  });

  it("stores the oldest commit date when fetchOldestCommitDate is fulfilled", () => {
    const next = activityReducer(
      initialActivityState,
      fetchOldestCommitDate.fulfilled("2020-05-01T00:00:00.000Z", "internal-id", undefined),
    );
    expect(next.oldestCommitDate).toBe("2020-05-01T00:00:00.000Z");
  });
});

describe("selectCommitsInRange", () => {
  it("includes a commit at exactly `until` even without millis precision", () => {
    const range: ActivityRange = {
      since: "2026-01-01T00:00:00.000Z",
      until: "2026-02-01T00:00:00.000Z",
    };
    const state = {
      activity: {
        ...initialActivityState,
        selectedRange: range,
        commitsByRepo: {
          "repo-1": {
            rangeLoaded: range,
            status: "idle",
            truncated: false,
            // Rust emits second-precision timestamps (no millis).
            commits: [commit({ sha: "boundary", timestamp: "2026-02-01T00:00:00Z" })],
          },
        },
      },
    } as unknown as RootState;
    expect(selectCommitsInRange(state).map((c) => c.sha)).toEqual(["boundary"]);
  });
});
