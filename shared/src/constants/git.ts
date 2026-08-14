export const DEFAULT_BRANCH = "main";

export const GIT_STATUS = {
  clean: "clean",
  dirty: "dirty",
  conflicted: "conflicted",
  unknown: "unknown",
} as const;

export type GitStatusKey = (typeof GIT_STATUS)[keyof typeof GIT_STATUS];

export const REPO_STATUS_EVENT = "repo://status";

/**
 * Emitted when a registered repository's folder is gone from disk — deleted or
 * moved outside the app.
 *
 * Needed because `repo://status` cannot express this: computing a status means
 * opening the repo, which is exactly what fails once the folder is gone, so the
 * backend has nothing to put in a status payload and previously stayed silent.
 *
 * `forgotten` distinguishes the two outcomes (see `RepoRemovedEventPayload`).
 */
export const REPO_REMOVED_EVENT = "repo://removed";
