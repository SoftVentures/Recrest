import { createReducer } from "@reduxjs/toolkit";

import { mergeRange, rangesOverlap } from "@/lib/activity/rangeMerge";
import {
  commitsChunkReceived,
  fetchCommitsRange,
  fetchOldestCommitDate,
  setSelectedRange,
} from "@/store/actions/activity.actions";
import type { ActivityState, RepoCommits } from "@/store/types/activity.types";

const DAY_MS = 86_400_000;

/** Default window: last 30 days (Plan 04/01 §C.1 "default lazy"). */
function defaultRange() {
  const until = new Date();
  const since = new Date(until.getTime() - 30 * DAY_MS);
  return { since: since.toISOString(), until: until.toISOString() };
}

export const initialActivityState: ActivityState = {
  commitsByRepo: {},
  selectedRange: defaultRange(),
  oldestCommitDate: null,
  activeRequestId: null,
};

const emptyRepo = (): RepoCommits => ({
  rangeLoaded: null,
  commits: [],
  status: "loading",
  truncated: false,
  seen: {},
});

export const activityReducer = createReducer(initialActivityState, (builder) => {
  builder
    .addCase(setSelectedRange, (state, action) => {
      // Ignore value-equal payloads: a fresh object with the same since/until
      // would still change the `selectedRange` reference and make the Activity
      // fetch effect refire an identical `list_commits` (belt-and-braces with
      // the page's mount-hydration guard).
      if (
        action.payload.since === state.selectedRange.since &&
        action.payload.until === state.selectedRange.until
      ) {
        return;
      }
      state.selectedRange = action.payload;
    })
    .addCase(fetchCommitsRange.pending, (state, action) => {
      state.activeRequestId = action.meta.arg.requestId;
      // Prune stale out-of-range commits: a disjoint request replaces the
      // single contiguous loaded range, so old data would otherwise linger
      // forever once mergeRange swaps rangeLoaded (see rangeMerge invariant).
      const requested = action.meta.arg.range;
      for (const repo of Object.values(state.commitsByRepo)) {
        if (repo.rangeLoaded && !rangesOverlap(repo.rangeLoaded, requested)) {
          repo.rangeLoaded = null;
          repo.commits = [];
          repo.seen = {};
          repo.status = "loading";
          repo.truncated = false;
        }
      }
    })
    .addCase(fetchCommitsRange.fulfilled, (state, action) => {
      if (action.meta.arg.requestId !== state.activeRequestId) return; // stale completion
      state.activeRequestId = null;
      if (!action.payload) return; // range already covered — no-op
      const requested = action.meta.arg.range;
      for (const [repoId, truncated] of Object.entries(action.payload.truncated)) {
        const repo = state.commitsByRepo[repoId] ?? emptyRepo();
        repo.truncated = truncated;
        repo.status = "idle";
        repo.rangeLoaded = mergeRange(repo.rangeLoaded, requested);
        state.commitsByRepo[repoId] = repo;
      }
    })
    .addCase(fetchCommitsRange.rejected, (state, action) => {
      if (action.meta.arg.requestId !== state.activeRequestId) return; // stale completion
      state.activeRequestId = null;
      for (const repo of Object.values(state.commitsByRepo)) {
        if (repo.status === "loading") repo.status = "error";
      }
    })
    .addCase(commitsChunkReceived, (state, action) => {
      const { requestId, repoId, commits, truncated, done } = action.payload;
      if (requestId !== state.activeRequestId) return; // stale stream
      const repo = state.commitsByRepo[repoId] ?? emptyRepo();
      // O(chunk) dedup against the persistent index — within one request the
      // revwalk never repeats a sha, so this only fires for the overlap of a
      // range-widening refetch. Rebuilding a Set per chunk was O(n²) over a
      // full "all"-preset stream.
      for (const c of commits) {
        if (!repo.seen[c.sha]) {
          repo.seen[c.sha] = true;
          repo.commits.push(c);
        }
      }
      if (truncated) repo.truncated = true;
      // Final chunk for this repo: mark it idle now, before the thunk fulfills.
      if (done) repo.status = "idle";
      state.commitsByRepo[repoId] = repo;
    })
    .addCase(fetchOldestCommitDate.fulfilled, (state, action) => {
      state.oldestCommitDate = action.payload;
    });
});
