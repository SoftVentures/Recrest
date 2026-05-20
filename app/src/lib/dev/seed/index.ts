import type {
  AppSettings,
  ProviderConnection,
  ProviderId,
  PullRequest,
  RecentCommit,
  Repository,
  RepositoryGroup,
  RepositoryId,
} from "@recrest/shared";

import { SEED_PROVIDERS } from "@/lib/dev/seed/providers";
import { SEED_PRS } from "@/lib/dev/seed/prs";
import { SEED_GROUPS, SEED_RECENT_COMMITS, SEED_REPOS } from "@/lib/dev/seed/repos";
import { SEED_SETTINGS } from "@/lib/dev/seed/settings";

/**
 * Shape of the object consumed by the dev Tauri stub. Mirrors `AppSeed` in
 * `tests/src/helpers/seed/index.ts` so the runtime contract stays identical
 * even though the modules live in two workspaces.
 */
export interface AppSeed {
  repos?: Repository[];
  groups?: Record<string, RepositoryGroup>;
  prs?: Record<RepositoryId, PullRequest[]>;
  recentCommits?: Record<RepositoryId, RecentCommit[]>;
  providers?: Partial<Record<ProviderId, ProviderConnection>>;
  settings?: AppSettings;
}

export const DEFAULT_SEED: Required<AppSeed> = {
  repos: SEED_REPOS,
  groups: SEED_GROUPS,
  prs: SEED_PRS,
  recentCommits: SEED_RECENT_COMMITS,
  providers: SEED_PROVIDERS,
  settings: SEED_SETTINGS,
};
