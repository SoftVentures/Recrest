import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  type CloneProgressStage,
  type CloneRemoteOutcome,
  type CloneRemoteRequest,
  type Organization,
  type ProviderId,
  type RemoteRepository,
  type RemoteRepositoryList,
  type Repository,
  TauriCommand,
} from "@recrest/shared";

import { invoke } from "@/lib/tauri";

interface CachedListing {
  repositories: RemoteRepository[];
  localMatches: Record<string, string>;
  loadedAt: number;
}

export interface RemoteImportState {
  /** Keyed by `${providerId}::${orgSlugOrUser}`. `user` = "__self__". */
  listings: Record<string, CachedListing>;
  organizations: Partial<Record<ProviderId, Organization[]>>;
  loading: Record<string, boolean>;
  error: string | null;
  /** Live progress per bulk-clone operation. Keyed by `remoteRepo.id`. */
  cloneProgress: Record<string, { stage: CloneProgressStage; error?: string }>;
}

const initialState: RemoteImportState = {
  listings: {},
  organizations: {},
  loading: {},
  error: null,
  cloneProgress: {},
};

export const SELF_KEY = "__self__";

export const keyFor = (providerId: ProviderId, orgSlug: string | null): string =>
  `${providerId}::${orgSlug ?? SELF_KEY}`;

export const fetchRemoteRepositories = createAsyncThunk<
  { key: string; value: RemoteRepositoryList },
  { providerId: ProviderId; orgSlug: string | null }
>("remoteImport/list", async ({ providerId, orgSlug }) => {
  const value = await invoke<RemoteRepositoryList>(TauriCommand.LIST_REMOTE_REPOSITORIES, {
    providerId,
    orgSlug,
  });
  return { key: keyFor(providerId, orgSlug), value };
});

export const fetchRemoteOrganizations = createAsyncThunk<
  { providerId: ProviderId; orgs: Organization[] },
  ProviderId
>("remoteImport/orgs", async (providerId) => {
  const orgs = await invoke<Organization[]>(TauriCommand.LIST_REMOTE_ORGANIZATIONS, { providerId });
  return { providerId, orgs };
});

export const cloneRemoteRepositoriesBulk = createAsyncThunk<
  CloneRemoteOutcome[],
  CloneRemoteRequest[]
>("remoteImport/bulk", async (requests) =>
  invoke<CloneRemoteOutcome[]>(TauriCommand.CLONE_REMOTE_REPOSITORIES_BULK, { requests }),
);

export const cloneRemoteRepository = createAsyncThunk<Repository, CloneRemoteRequest>(
  "remoteImport/single",
  async (request) => invoke<Repository>(TauriCommand.CLONE_REMOTE_REPOSITORY, { request }),
);

const remoteImportSlice = createSlice({
  name: "remoteImport",
  initialState,
  reducers: {
    clearProgress(state) {
      state.cloneProgress = {};
    },
    setProgress(
      state,
      action: PayloadAction<{ remoteRepoId: string; stage: CloneProgressStage; error?: string }>,
    ) {
      state.cloneProgress[action.payload.remoteRepoId] = {
        stage: action.payload.stage,
        error: action.payload.error,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRemoteRepositories.pending, (state, action) => {
        const { providerId, orgSlug } = action.meta.arg;
        state.loading[keyFor(providerId, orgSlug)] = true;
        state.error = null;
      })
      .addCase(fetchRemoteRepositories.fulfilled, (state, action) => {
        state.listings[action.payload.key] = {
          repositories: action.payload.value.repositories,
          localMatches: action.payload.value.localMatches,
          loadedAt: Date.now(),
        };
        state.loading[action.payload.key] = false;
      })
      .addCase(fetchRemoteRepositories.rejected, (state, action) => {
        const { providerId, orgSlug } = action.meta.arg;
        state.loading[keyFor(providerId, orgSlug)] = false;
        state.error = action.error.message ?? "failed to list remote repositories";
      })
      .addCase(fetchRemoteOrganizations.fulfilled, (state, action) => {
        state.organizations[action.payload.providerId] = action.payload.orgs;
      });
  },
});

export const { clearProgress, setProgress } = remoteImportSlice.actions;
export const remoteImportReducer = remoteImportSlice.reducer;
