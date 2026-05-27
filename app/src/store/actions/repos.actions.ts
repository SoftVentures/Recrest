import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type GitMergeResult,
  type Repository,
  type RepositoryGroup,
  type RepositoryId,
  type RepositoryStatus,
  TauriCommand,
} from "@recrest/shared";

import { invoke } from "@/lib/tauri";

export const setScanPaths = createAction<string[]>("repos/setScanPaths");
export const upsertRepo = createAction<Repository>("repos/upsertRepo");
export const setGroups = createAction<Record<string, RepositoryGroup>>("repos/setGroups");

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

/** Persists (or clears, when `keyPath` is null) the per-repo SSH key and
 *  returns the refreshed repo so the store reflects the new `sshKeyPath`. */
export const setRepoSshKey = createAsyncThunk<
  Repository,
  { repoId: RepositoryId; keyPath: string | null }
>("repos/setSshKey", async ({ repoId, keyPath }) => {
  await invoke<void>(TauriCommand.SET_REPO_SSH_KEY, { repoId, keyPath });
  return invoke<Repository>(TauriCommand.REPO_STATUS, { repoId });
});

/** Caches the SSH key passphrase for this repo for the current session. */
export const sshUnlockKey = createAsyncThunk<void, { repoId: RepositoryId; passphrase: string }>(
  "repos/sshUnlock",
  async ({ repoId, passphrase }) => {
    await invoke<void>(TauriCommand.SSH_UNLOCK_KEY, { repoId, passphrase });
  },
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

export const deleteRepo = createAsyncThunk<RepositoryId, RepositoryId>(
  "repos/delete",
  async (repoId) => {
    await invoke<void>(TauriCommand.DELETE_REPO, { repoId });
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
