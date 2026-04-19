import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  type PrFilters,
  type PullRequest,
  type PullRequestDetail,
  type RepositoryId,
  TauriCommand,
} from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export interface PrsState {
  items: Record<RepositoryId, PullRequest[]>;
  detail: Record<string, PullRequestDetail>;
  detailLoading: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: PrFilters;
}

const initialFilters: PrFilters = {
  state: ["open"],
  ciStatus: [],
  draft: "any",
  author: null,
};

const initialState: PrsState = {
  items: {},
  detail: {},
  detailLoading: {},
  loading: false,
  error: null,
  lastFetched: null,
  filters: initialFilters,
};

export const fetchPullRequests = createAsyncThunk<
  { repoId: RepositoryId; prs: PullRequest[] },
  RepositoryId
>("prs/fetch", async (repoId) => {
  const prs = await invoke<PullRequest[]>(TauriCommand.FETCH_PULL_REQUESTS, { repoId });
  return { repoId, prs };
});

export const detailKey = (repoId: RepositoryId, prNumber: number): string =>
  `${repoId}#${prNumber}`;

export const loadPrDetail = createAsyncThunk<
  { key: string; detail: PullRequestDetail },
  { repoId: RepositoryId; prNumber: number }
>("prs/detail", async ({ repoId, prNumber }) => {
  const detail = await invoke<PullRequestDetail>(TauriCommand.GET_PR_DETAIL, { repoId, prNumber });
  return { key: detailKey(repoId, prNumber), detail };
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
    setFilters(state, action: PayloadAction<Partial<PrFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialFilters;
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
        state.error = action.error.message ?? "failed to fetch merge requests";
      })
      .addCase(loadPrDetail.pending, (state, action) => {
        state.detailLoading[detailKey(action.meta.arg.repoId, action.meta.arg.prNumber)] = true;
      })
      .addCase(loadPrDetail.fulfilled, (state, action) => {
        state.detail[action.payload.key] = action.payload.detail;
        state.detailLoading[action.payload.key] = false;
      })
      .addCase(loadPrDetail.rejected, (state, action) => {
        const k = detailKey(action.meta.arg.repoId, action.meta.arg.prNumber);
        state.detailLoading[k] = false;
      });
  },
});

export const { setPrs, clearPrs, setFilters, resetFilters } = prsSlice.actions;
export const prsReducer = prsSlice.reducer;
