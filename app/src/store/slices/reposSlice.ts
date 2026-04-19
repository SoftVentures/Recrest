import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  type GitMergeResult,
  type Repository,
  type RepositoryGroup,
  type RepositoryId,
  type RepositoryStatus,
  TauriCommand,
} from "@recrest/shared";

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
  invoke<Repository[]>(TauriCommand.SCAN_REPOS, { paths }),
);

export const loadRepos = createAsyncThunk<Repository[]>("repos/list", async () =>
  invoke<Repository[]>(TauriCommand.LIST_REPOS),
);

export const refreshRepoStatus = createAsyncThunk<Repository, RepositoryId>(
  "repos/status",
  async (repoId) => invoke<Repository>(TauriCommand.REPO_STATUS, { repoId }),
);

export const addRepo = createAsyncThunk<Repository, { path: string; groupId?: string | null }>(
  "repos/add",
  async ({ path, groupId }) =>
    invoke<Repository>(TauriCommand.ADD_REPO, { path, groupId: groupId ?? null }),
);

export const removeRepo = createAsyncThunk<RepositoryId, RepositoryId>(
  "repos/remove",
  async (repoId) => {
    await invoke<void>(TauriCommand.REMOVE_REPO, { repoId });
    return repoId;
  },
);

export const gitFetch = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  RepositoryId
>("repos/fetch", async (repoId) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_FETCH, { repoId }),
}));

export const gitPull = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  RepositoryId
>("repos/pull", async (repoId) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_PULL, { repoId }),
}));

export const gitPush = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  RepositoryId
>("repos/push", async (repoId) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_PUSH, { repoId }),
}));

export const gitCheckout = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; branch: string }
>("repos/checkout", async ({ repoId, branch }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_CHECKOUT, { repoId, branch }),
}));

export const gitBranchCreate = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; name: string; from?: string | null; checkout: boolean }
>("repos/branchCreate", async ({ repoId, name, from, checkout }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_BRANCH_CREATE, {
    repoId,
    name,
    from: from ?? null,
    checkout,
  }),
}));

export const gitMerge = createAsyncThunk<
  { repoId: RepositoryId; result: GitMergeResult },
  {
    repoId: RepositoryId;
    source: string;
    target?: string | null;
    message?: string | null;
  }
>("repos/merge", async ({ repoId, source, target, message }) => ({
  repoId,
  result: await invoke<GitMergeResult>(TauriCommand.GIT_MERGE, {
    repoId,
    source,
    target: target ?? null,
    message: message ?? null,
  }),
}));

export const gitCloneUrl = createAsyncThunk<
  Repository,
  { url: string; destination: string; subFolder?: string | null }
>("repos/clone", async ({ url, destination, subFolder }) =>
  invoke<Repository>(TauriCommand.GIT_CLONE, {
    url,
    destination,
    subFolder: subFolder ?? null,
  }),
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
      })
      .addCase(gitFetch.fulfilled, (state, action) => {
        const repo = state.items[action.payload.repoId];
        if (repo) repo.status = action.payload.status;
      })
      .addCase(gitPull.fulfilled, (state, action) => {
        const repo = state.items[action.payload.repoId];
        if (repo) repo.status = action.payload.status;
      })
      .addCase(gitPush.fulfilled, (state, action) => {
        const repo = state.items[action.payload.repoId];
        if (repo) repo.status = action.payload.status;
      })
      .addCase(gitCheckout.fulfilled, (state, action) => {
        const repo = state.items[action.payload.repoId];
        if (repo) repo.status = action.payload.status;
      })
      .addCase(gitBranchCreate.fulfilled, (state, action) => {
        const repo = state.items[action.payload.repoId];
        if (repo) repo.status = action.payload.status;
      })
      .addCase(gitMerge.fulfilled, (state, action) => {
        const repo = state.items[action.payload.repoId];
        if (repo) repo.status = action.payload.result.status;
      })
      .addCase(gitCloneUrl.fulfilled, (state, action) => {
        state.items[action.payload.id] = action.payload;
      });
  },
});

export const { setScanPaths, upsertRepo, setGroups } = reposSlice.actions;
export const reposReducer = reposSlice.reducer;
