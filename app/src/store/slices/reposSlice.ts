import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import type { Repository, RepositoryGroup, RepositoryId } from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export interface ReposState {
  items: Record<RepositoryId, Repository>;
  groups: Record<string, RepositoryGroup>;
  scanPaths: string[];
  loading: boolean;
  error: string | null;
}

const initialState: ReposState = {
  items: {},
  groups: {},
  scanPaths: [],
  loading: false,
  error: null,
};

export const scanForRepos = createAsyncThunk<Repository[], string[]>("repos/scan", async (paths) =>
  invoke<Repository[]>("scan_repos", { paths }),
);

export const loadRepos = createAsyncThunk<Repository[]>("repos/list", async () =>
  invoke<Repository[]>("list_repos"),
);

export const refreshRepoStatus = createAsyncThunk<Repository, RepositoryId>(
  "repos/status",
  async (repoId) => invoke<Repository>("repo_status", { repoId }),
);

export const addRepo = createAsyncThunk<Repository, { path: string; groupId?: string | null }>(
  "repos/add",
  async ({ path, groupId }) => invoke<Repository>("add_repo", { path, groupId: groupId ?? null }),
);

export const removeRepo = createAsyncThunk<RepositoryId, RepositoryId>(
  "repos/remove",
  async (repoId) => {
    await invoke<void>("remove_repo", { repoId });
    return repoId;
  },
);

const reposSlice = createSlice({
  name: "repos",
  initialState,
  reducers: {
    setScanPaths(state, action: PayloadAction<string[]>) {
      state.scanPaths = action.payload;
    },
    upsertRepo(state, action: PayloadAction<Repository>) {
      state.items[action.payload.id] = action.payload;
    },
    setGroups(state, action: PayloadAction<Record<string, RepositoryGroup>>) {
      state.groups = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(scanForRepos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scanForRepos.fulfilled, (state, action) => {
        state.loading = false;
        for (const repo of action.payload) {
          state.items[repo.id] = repo;
        }
      })
      .addCase(scanForRepos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "scan failed";
      })
      .addCase(loadRepos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRepos.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Object.fromEntries(action.payload.map((r) => [r.id, r]));
      })
      .addCase(loadRepos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "load failed";
      })
      .addCase(refreshRepoStatus.fulfilled, (state, action) => {
        state.items[action.payload.id] = action.payload;
      })
      .addCase(addRepo.fulfilled, (state, action) => {
        state.items[action.payload.id] = action.payload;
      })
      .addCase(removeRepo.fulfilled, (state, action) => {
        delete state.items[action.payload];
      });
  },
});

export const { setScanPaths, upsertRepo, setGroups } = reposSlice.actions;
export const reposReducer = reposSlice.reducer;
