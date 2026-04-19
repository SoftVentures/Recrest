/**
 * Shared fixtures for vitest tests and Storybook stories.
 *
 * Kept deliberately minimal — expand as real tests/stories start using them.
 * Any fixture here should be a plain object or pure factory (no IPC calls,
 * no DOM mutations) so it works identically in jsdom and a Storybook
 * iframe.
 */
import type { BranchInfo, ProviderConnection, Repository, RepositoryStatus } from "@recrest/shared";

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
