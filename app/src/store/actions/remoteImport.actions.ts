import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

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
import { keyFor } from "@/store/types/remoteImport.types";

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

export const clearCloneProgress = createAction("remoteImport/clearProgress");

export const setCloneProgress = createAction<{
  remoteRepoId: string;
  stage: CloneProgressStage;
  error?: string;
}>("remoteImport/setProgress");

export type RemoteRepoView = RemoteRepository;
