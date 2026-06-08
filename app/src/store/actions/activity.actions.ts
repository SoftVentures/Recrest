import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type ActivityRange,
  type CommitsChunkPayload,
  type ListCommitsSummary,
  TauriCommand,
} from "@recrest/shared";

import { planFetchWindow } from "@/lib/activity/fetchPlan";
import { invoke } from "@/lib/tauri";
import type { RootState } from "@/store";

export const setSelectedRange = createAction<ActivityRange>("activity/setSelectedRange");
export const commitsChunkReceived = createAction<CommitsChunkPayload>(
  "activity/commitsChunkReceived",
);

/** Fetches only the parts of `range` not loaded yet across the full repo
 *  universe (`repos.items`, so a freshly-scanned repo still gets walked even
 *  when other repos already cover the range). Dedupe happens in the reducer
 *  via sha. Returns null when every known repo already fully covers `range`. */
export const fetchCommitsRange = createAsyncThunk<
  ListCommitsSummary | null,
  { range: ActivityRange; requestId: string },
  { state: RootState }
>("activity/fetchCommitsRange", async ({ range, requestId }, { getState }) => {
  const state = getState();
  const window = planFetchWindow(
    Object.keys(state.repos.items),
    state.activity.commitsByRepo,
    range,
  );
  if (!window) return null;
  return invoke<ListCommitsSummary>(TauriCommand.LIST_COMMITS, {
    requestId,
    since: window.since,
    until: window.until,
  });
});

export const fetchOldestCommitDate = createAsyncThunk<string | null>(
  "activity/fetchOldestCommitDate",
  async () => invoke<string | null>(TauriCommand.GET_OLDEST_COMMIT_DATE, {}),
);
