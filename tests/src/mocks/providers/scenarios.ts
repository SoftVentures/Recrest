import type { MockProviderSuite } from "./index";

/// Plan-8 failure-mode scenarios. Each named scenario flips a few of the
/// in-memory flags in `MockState.scenarios.*` so a spec can assert error-
/// handling paths without re-stubbing routes.
///
/// One scenario per HTTP-response-driven `CommandError::bad_request`
/// branch in the Rust provider clients — anything that fails locally
/// (parse-failures, missing-token) is exercised by Rust unit tests and
/// doesn't need a mock scenario.

export interface ScenarioPatch {
  github?: Partial<{
    mergeConflict: boolean;
    authExpired: boolean;
    rateLimitedUntil: number | null;
  }>;
  gitlab?: Partial<{
    mergeConflict: boolean;
    authExpired: boolean;
    rateLimitedUntil: number | null;
    rebaseStuckForever: boolean;
    deleteSucceedsButBranchSurvives: boolean;
  }>;
  bitbucket?: Partial<{
    mergeConflict: boolean;
    authExpired: boolean;
    rateLimitedUntil: number | null;
  }>;
}

export const SCENARIOS = {
  github_pr_merge_conflict: { github: { mergeConflict: true } },
  github_auth_expired: { github: { authExpired: true } },
  github_rate_limited: {
    github: { rateLimitedUntil: Number.MAX_SAFE_INTEGER },
  },

  gitlab_pr_merge_conflict: { gitlab: { mergeConflict: true } },
  gitlab_auth_expired: { gitlab: { authExpired: true } },
  gitlab_rate_limited: {
    gitlab: { rateLimitedUntil: Number.MAX_SAFE_INTEGER },
  },
  /// `rebase_in_progress` stays `true` forever — the Rust polling loop
  /// (`gitlab.rs::merge_pull_request`'s rebase branch) gives up after 30s
  /// with `CommandError::bad_request("GitLab rebase did not finish ...")`.
  gitlab_rebase_stuck: { gitlab: { rebaseStuckForever: true } },
  /// Merge succeeds but the source branch is still present afterwards
  /// (protected-branch case). Plan-7 Code-Review finding fixed via a
  /// branch-existence GET — this scenario locks that fix in place.
  gitlab_protected_branch: {
    gitlab: { deleteSucceedsButBranchSurvives: true },
  },

  bitbucket_pr_merge_conflict: { bitbucket: { mergeConflict: true } },
  bitbucket_auth_expired: { bitbucket: { authExpired: true } },
  bitbucket_rate_limited: {
    bitbucket: { rateLimitedUntil: Number.MAX_SAFE_INTEGER },
  },
} satisfies Record<string, ScenarioPatch>;

export type ScenarioName = keyof typeof SCENARIOS;

/// Apply a named scenario to a running suite. Idempotent — calling twice
/// with the same name re-asserts the same flags. Multiple scenarios can be
/// applied in sequence to compose failure modes.
export function applyScenario(suite: MockProviderSuite, name: ScenarioName): void {
  const patch = SCENARIOS[name] as ScenarioPatch;
  const s = suite.state.scenarios;
  if (patch.github) Object.assign(s.github, patch.github);
  if (patch.gitlab) Object.assign(s.gitlab, patch.gitlab);
  if (patch.bitbucket) Object.assign(s.bitbucket, patch.bitbucket);
}
