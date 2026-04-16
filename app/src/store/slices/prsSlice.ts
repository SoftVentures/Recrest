import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import type { PullRequest, RepositoryId } from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export interface PrsState {
  items: Record<RepositoryId, PullRequest[]>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: PrsState = {
  items: {},
  loading: false,
  error: null,
  lastFetched: null,
};

export const fetchPullRequests = createAsyncThunk<
  { repoId: RepositoryId; prs: PullRequest[] },
  RepositoryId
>("prs/fetch", async (repoId) => {
  const prs = await invoke<PullRequest[]>("fetch_pull_requests", { repoId });
  return { repoId, prs };
});

const prsSlice = createSlice({
  name: "prs",
  initialState,
  reducers: {
    setPrs(state, action: PayloadAction<{ repoId: RepositoryId; prs: PullRequest[] }>) {
      state.items[action.payload.repoId] = action.payload.prs;
    },
    clearPrs(state, action: PayloadAction<RepositoryId>) {
      delete state.items[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPullRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPullRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.items[action.payload.repoId] = action.payload.prs;
        state.lastFetched = Date.now();
      })
      .addCase(fetchPullRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "failed to fetch pull requests";
      });
  },
});

export const { setPrs, clearPrs } = prsSlice.actions;
export const prsReducer = prsSlice.reducer;
