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

import { SEED_PROVIDERS } from "./providers.js";
import { SEED_PRS, SEED_PR_COUNTS } from "./prs.js";
import { SEED_GROUPS, SEED_RECENT_COMMITS, SEED_REPOS } from "./repos.js";
import { SEED_SETTINGS, SEED_SETTINGS_DARK, SEED_SETTINGS_DE } from "./settings.js";

/**
 * Shape of the object consumed by the Tauri stub. Every field is optional
 * because tests often override a single slice — `test.use({ seed: { repos: [] } })`
 * drops everything except the empty-repo list back to defaults.
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

export const EMPTY_SEED: Required<AppSeed> = {
  repos: [],
  groups: {},
  prs: {},
  recentCommits: {},
  providers: {},
  settings: SEED_SETTINGS,
};

export function resolveSeed(partial?: AppSeed): Required<AppSeed> {
  return {
    repos: partial?.repos ?? DEFAULT_SEED.repos,
    groups: partial?.groups ?? DEFAULT_SEED.groups,
    prs: partial?.prs ?? DEFAULT_SEED.prs,
    recentCommits: partial?.recentCommits ?? DEFAULT_SEED.recentCommits,
    providers: partial?.providers ?? DEFAULT_SEED.providers,
    settings: partial?.settings ?? DEFAULT_SEED.settings,
  };
}

export {
  SEED_GROUPS,
  SEED_PRS,
  SEED_PR_COUNTS,
  SEED_PROVIDERS,
  SEED_RECENT_COMMITS,
  SEED_REPOS,
  SEED_SETTINGS,
  SEED_SETTINGS_DARK,
  SEED_SETTINGS_DE,
};
