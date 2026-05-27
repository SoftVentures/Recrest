import { createReducer } from "@reduxjs/toolkit";

import {
  clearCloneProgress,
  fetchRemoteOrganizations,
  fetchRemoteRepositories,
  setCloneProgress,
} from "@/store/actions/remoteImport.actions";
import { type RemoteImportState, keyFor } from "@/store/types/remoteImport.types";

const initialState: RemoteImportState = {
  listings: {},
  organizations: {},
  loading: {},
  error: null,
  cloneProgress: {},
};

export const remoteImportReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(clearCloneProgress, (state) => {
      state.cloneProgress = {};
    })
    .addCase(setCloneProgress, (state, action) => {
      state.cloneProgress[action.payload.remoteRepoId] = {
        stage: action.payload.stage,
        error: action.payload.error,
      };
    })
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
});

export type { RemoteImportState } from "@/store/types/remoteImport.types";
