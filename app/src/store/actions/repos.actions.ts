import { createAction, createAsyncThunk } from "@reduxjs/toolkit";

import {
  type DiscardResult,
  type GitConfigEntry,
  type GitConfigLayer,
  type GitMergeResult,
  type Repository,
  type RepositoryGroup,
  type RepositoryId,
  type RepositoryStatus,
  type StashEntry,
  TauriCommand,
} from "@recrest/shared";

import { invoke } from "@/lib/tauri";
import { invalidateRepoLogoCache } from "@/lib/utils/repoLogo.utils";

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

/** Copies an image into the managed avatar dir and points the repo at it.
 *  Returns the refreshed repo so the store picks up the new `logoPath`.
 *  Busts the per-path data-URI cache because the backend writes to the
 *  same `<repo_id>.<ext>` filename on re-upload. */
export const setRepoLogo = createAsyncThunk<
  Repository,
  { repoId: RepositoryId; sourcePath: string }
>("repos/setLogo", async ({ repoId, sourcePath }) => {
  const next = await invoke<Repository>(TauriCommand.SET_REPO_LOGO, {
    repoId,
    sourcePath,
  });
  invalidateRepoLogoCache(next.logoPath);
  return next;
});

/** Removes the per-repo avatar override so the UI falls back to the
 *  in-repo auto-detected logo (or initials). */
export const clearRepoLogo = createAsyncThunk<Repository, RepositoryId>(
  "repos/clearLogo",
  async (repoId) => {
    const next = await invoke<Repository>(TauriCommand.CLEAR_REPO_LOGO, { repoId });
    invalidateRepoLogoCache(next.logoPath);
    return next;
  },
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

/** Drops every repo discovered under a removed scan root (unless still covered
 *  by a remaining root) and returns the forgotten ids so the store can prune
 *  them. The backend decides containment on canonicalised paths — see
 *  `forget_repos_under_path`. */
export const forgetReposUnderPath = createAsyncThunk<
  RepositoryId[],
  { removedPath: string; remainingPaths: string[] }
>("repos/forgetUnderPath", async ({ removedPath, remainingPaths }) =>
  invoke<RepositoryId[]>(TauriCommand.FORGET_REPOS_UNDER_PATH, { removedPath, remainingPaths }),
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

export const gitStage = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; paths: string[] }
>("repos/stage", async ({ repoId, paths }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_STAGE, { repoId, paths }),
}));

export const gitUnstage = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; paths: string[] }
>("repos/unstage", async ({ repoId, paths }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_UNSTAGE, { repoId, paths }),
}));

export const gitDiscard = createAsyncThunk<
  { repoId: RepositoryId; result: DiscardResult },
  { repoId: RepositoryId; paths: string[]; force?: boolean }
>("repos/discard", async ({ repoId, paths, force }) => ({
  repoId,
  result: await invoke<DiscardResult>(TauriCommand.GIT_DISCARD, {
    repoId,
    paths,
    force: force ?? false,
  }),
}));

export const gitStash = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; message?: string | null }
>("repos/stash", async ({ repoId, message }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_STASH, {
    repoId,
    message: message ?? null,
  }),
}));

export const gitStashList = createAsyncThunk<
  { repoId: RepositoryId; entries: StashEntry[] },
  RepositoryId
>("repos/stashList", async (repoId) => ({
  repoId,
  entries: await invoke<StashEntry[]>(TauriCommand.GIT_STASH_LIST, { repoId }),
}));

export const gitStashPop = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; index: number }
>("repos/stashPop", async ({ repoId, index }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_STASH_POP, { repoId, index }),
}));

export const gitStashDrop = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; index: number }
>("repos/stashDrop", async ({ repoId, index }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_STASH_DROP, { repoId, index }),
}));

export const gitCommit = createAsyncThunk<
  { repoId: RepositoryId; status: RepositoryStatus },
  { repoId: RepositoryId; message: string }
>("repos/commit", async ({ repoId, message }) => ({
  repoId,
  status: await invoke<RepositoryStatus>(TauriCommand.GIT_COMMIT, { repoId, message }),
}));

export const loadGitConfigLayers = createAsyncThunk<
  GitConfigLayer[],
  { repoId: RepositoryId | null }
>("repos/gitConfigLayers", async ({ repoId }) =>
  invoke<GitConfigLayer[]>(TauriCommand.LIST_GIT_CONFIG_LAYERS, { repoId }),
);

export const loadGitConfigWithOrigins = createAsyncThunk<
  Record<string, GitConfigEntry>,
  { repoId: RepositoryId | null }
>("repos/gitConfigOrigins", async ({ repoId }) =>
  invoke<Record<string, GitConfigEntry>>(TauriCommand.GET_GIT_CONFIG_WITH_ORIGINS, { repoId }),
);

export const setGitConfigInLayer = createAsyncThunk<
  Record<string, GitConfigEntry>,
  { repoId: RepositoryId | null; filePath: string; key: string; value: string }
>("repos/setGitConfigInLayer", async ({ repoId, filePath, key, value }) =>
  invoke<Record<string, GitConfigEntry>>(TauriCommand.SET_GIT_CONFIG_IN_LAYER, {
    repoId,
    filePath,
    key,
    value,
  }),
);

export const addGitConfigInclude = createAsyncThunk<
  void,
  {
    configFile: string;
    condition: string | null;
    targetPath: string;
    createTargetSkeleton: boolean;
  }
>("repos/addGitConfigInclude", async (args) => {
  await invoke<void>(TauriCommand.ADD_GIT_CONFIG_INCLUDE, args);
});

export const removeGitConfigInclude = createAsyncThunk<
  void,
  {
    configFile: string;
    condition: string | null;
    targetPath: string;
    deleteTargetFile: boolean;
  }
>("repos/removeGitConfigInclude", async (args) => {
  await invoke<void>(TauriCommand.REMOVE_GIT_CONFIG_INCLUDE, args);
});
