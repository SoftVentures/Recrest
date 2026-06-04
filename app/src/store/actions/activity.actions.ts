import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type ActivityRange,
  type CommitsChunkPayload,
  type ListCommitsSummary,
  TauriCommand,
} from "@recrest/shared";

import { missingSubranges } from "@/lib/activity/rangeMerge";
import { invoke } from "@/lib/tauri";
import type { RootState } from "@/store";

export const setSelectedRange = createAction<ActivityRange>("activity/setSelectedRange");
export const commitsChunkReceived = createAction<CommitsChunkPayload>(
  "activity/commitsChunkReceived",
);

/** Fetches only the parts of `range` that are not loaded yet. Repos are
 *  fetched together so their rangeLoaded values stay in lockstep — the widest
 *  already-loaded range serves as the merge anchor; dedupe happens in the
 *  reducer via sha. Returns null when the range is already fully covered. */
export const fetchCommitsRange = createAsyncThunk<
  ListCommitsSummary | null,
  { range: ActivityRange; requestId: string },
  { state: RootState }
>("activity/fetchCommitsRange", async ({ range, requestId }, { getState }) => {
  const byRepo = getState().activity.commitsByRepo;
  const anyLoaded = Object.values(byRepo).find((r) => r.rangeLoaded)?.rangeLoaded ?? null;
  const gaps = missingSubranges(anyLoaded, range);
  if (gaps.length === 0) return null;
  const since = gaps.reduce((a, g) => (g.since < a ? g.since : a), gaps[0]!.since);
  const until = gaps.reduce((a, g) => (g.until > a ? g.until : a), gaps[0]!.until);
  return invoke<ListCommitsSummary>(TauriCommand.LIST_COMMITS, { requestId, since, until });
});

export const fetchOldestCommitDate = createAsyncThunk<string | null>(
  "activity/fetchOldestCommitDate",
  async () => invoke<string | null>(TauriCommand.GET_OLDEST_COMMIT_DATE, {}),
);
