import { createAsyncThunk } from "@reduxjs/toolkit";

import { type BranchInfo, TauriCommand } from "@recrest/shared";

import { invoke } from "@/lib/tauri";

/**
 * Load branches for a SINGLE repo. The Branches tab dispatches one of these per
 * repo so groups render progressively — each lands in the store the instant its
 * own `git_list_branches` resolves, instead of one batched `Promise.all` that
 * blocks every group on the slowest repo. A failure collapses to an empty list
 * so a bad remote doesn't surface as an error.
 */
export const loadBranches = createAsyncThunk<{ repoId: string; branches: BranchInfo[] }, string>(
  "branches/load",
  async (repoId) => {
    try {
      const branches = await invoke<BranchInfo[]>(TauriCommand.GIT_LIST_BRANCHES, { repoId });
      return { repoId, branches };
    } catch {
      return { repoId, branches: [] };
    }
  },
);
