/**
 * Shared fixtures for vitest tests and Storybook stories.
 *
 * Kept deliberately minimal — expand as real tests/stories start using them.
 * Any fixture here should be a plain object or pure factory (no IPC calls,
 * no DOM mutations) so it works identically in jsdom and a Storybook
 * iframe.
 */
import type {
  BranchInfo,
  ProviderConnection,
  PullRequest,
  Repository,
  RepositoryStatus,
} from "@recrest/shared";

import { type EnrichedRepo, enrichRepo } from "@/lib/repoEnrich";

export const emptyStatus: RepositoryStatus = {
  branch: "main",
  head: null,
  ahead: 0,
  behind: 0,
  staged: 0,
  unstaged: 0,
  untracked: 0,
  conflicted: 0,
  dirty: false,
  lastCommit: null,
  remoteUrl: null,
  changedFiles: [],
  changedFilesTruncated: false,
  commitActivity: Array.from({ length: 14 }, () => 0),
  addedLines: 0,
  removedLines: 0,
  language: null,
  languages: null,
};

export const sampleRepo: Repository = {
  id: "repo-1",
  name: "recrest",
  path: "/Users/dev/code/recrest",
  groupId: null,
  remoteUrl: "https://github.com/softventures/recrest",
  providerId: "github",
  status: emptyStatus,
  logoPath: null,
  logoDarkPath: null,
};

export const sampleBranch: BranchInfo = {
  name: "main",
  isCurrent: true,
  isRemote: false,
  remote: null,
  upstream: "origin/main",
  ahead: 0,
  behind: 0,
  clean: false,
  lastCommit: null,
};

export const sampleProvider: ProviderConnection = {
  providerId: "github",
  displayName: "GitHub",
  connected: true,
  username: "octocat",
  supportsOauth: false,
  baseUrl: "https://api.github.com",
};

/** Factory helper: build a `Repository` DTO with per-field overrides. */
export function makeRepo(over: Partial<Repository> = {}): Repository {
  return {
    ...sampleRepo,
    ...over,
    status: { ...emptyStatus, ...(over.status ?? {}) },
  };
}

/** Factory helper: build an enriched repo the UI-side components expect. */
export function makeEnrichedRepo(over: Partial<Repository> = {}): EnrichedRepo {
  return enrichRepo(makeRepo(over));
}

/** Factory helper: a minimal `PullRequest` DTO usable in tests + stories. */
export function makePullRequest(over: Partial<PullRequest> = {}): PullRequest {
  return {
    id: "pr-1",
    number: 1,
    title: "feat: something useful",
    url: "https://example.com/pr/1",
    author: "octocat",
    state: "open",
    draft: false,
    sourceBranch: "feature/x",
    targetBranch: "main",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    additions: null,
    deletions: null,
    ciStatus: null,
    ...over,
  } as unknown as PullRequest;
}
