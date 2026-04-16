export const DEFAULT_BRANCH = "main";

export const GIT_STATUS = {
  clean: "clean",
  dirty: "dirty",
  conflicted: "conflicted",
  unknown: "unknown",
} as const;

export type GitStatusKey = (typeof GIT_STATUS)[keyof typeof GIT_STATUS];

export const REPO_STATUS_EVENT = "repo://status";
