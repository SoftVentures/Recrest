/// Shared mutable in-memory state for the Plan-8 mock provider servers.
/// One instance per `MockProviderSuite.start()`; reset between tests via
/// `suite.reset()`. State is intentionally tiny: just the bits a test needs
/// to observe ("did the merge call happen?", "is the branch gone now?")
/// without modeling the entire provider domain.

export interface RequestRecord {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export interface MergedPrRecord {
  /// Strategy the client actually sent (`merge` | `squash` | `rebase` |
  /// `merge_commit` | `fast_forward`). Asserted by specs.
  strategy: string;
  /// Mock merge SHA returned in the response — stable per (provider, prNumber).
  sha: string;
  /// Optional commit-message echo so a spec can verify the title+body wiring.
  message: string | null;
}

/// Per-provider scenario flags. Set by `applyScenario`; read by route
/// handlers. Each flag corresponds to one failure-mode path in the Rust
/// provider clients (see scenarios.ts).
export interface ProviderScenarioFlags {
  /// Force the merge endpoint to return 405 with a "not mergeable" body
  /// (GitHub) / 405 (`{"message":"Method Not Allowed"}` GitLab) / 409 (BB).
  mergeConflict: boolean;
  /// Force a 401 on every request — simulates expired token.
  authExpired: boolean;
  /// Return 429 on every request until `rateLimitedUntil` is in the past.
  rateLimitedUntil: number | null;
  /// GitLab-only: keep `/rebase_in_progress` true forever, so the rebase
  /// poll loop times out instead of completing.
  rebaseStuckForever: boolean;
  /// GitLab-only: pretend the source branch still exists after a merge
  /// with `should_remove_source_branch=true` (protected-branch case).
  deleteSucceedsButBranchSurvives: boolean;
  /// Pages-disabled — GH/GL `/pages` endpoint returns 404.
  pagesDisabled: boolean;
  /// Bitbucket-only — return a `bitbucket-pipelines.yml` that contains an
  /// `aws-s3-deploy` pipe so the Pages fallback detects it.
  bitbucketPipelinePages: boolean;
  /// GitHub-only — workflow detail returns required inputs so the CI
  /// dispatch form has fields to render.
  workflowInputsRequired: boolean;
  /// GitHub-only — workflow dispatch endpoint returns 404 to exercise the
  /// error-toast surfacing.
  workflowDispatch404: boolean;
}

export function freshScenarioFlags(): ProviderScenarioFlags {
  return {
    mergeConflict: false,
    authExpired: false,
    rateLimitedUntil: null,
    rebaseStuckForever: false,
    deleteSucceedsButBranchSurvives: false,
    pagesDisabled: false,
    bitbucketPipelinePages: false,
    workflowInputsRequired: false,
    workflowDispatch404: false,
  };
}

export interface MockState {
  /// Provider id → set of branch names that have been DELETEd this run.
  /// Listed branches GET endpoints honour this for the "after merge,
  /// branch row disappears" assertion path.
  deletedBranches: {
    github: Set<string>;
    gitlab: Set<string>;
    bitbucket: Set<string>;
  };
  /// Provider id → map of PR-number → merge record. The list endpoints
  /// flip the matching PR's `state` to `merged` after this is set.
  mergedPrs: {
    github: Map<number, MergedPrRecord>;
    gitlab: Map<number, MergedPrRecord>;
    bitbucket: Map<number, MergedPrRecord>;
  };
  /// Per-provider request log, in arrival order. Tests use this to assert
  /// the right endpoint got called with the right body — e.g. "PUT /merge
  /// got `merge_method: squash`".
  requests: {
    github: RequestRecord[];
    gitlab: RequestRecord[];
    bitbucket: RequestRecord[];
  };
  scenarios: {
    github: ProviderScenarioFlags;
    gitlab: ProviderScenarioFlags;
    bitbucket: ProviderScenarioFlags;
  };
}

export function freshState(): MockState {
  return {
    deletedBranches: {
      github: new Set(),
      gitlab: new Set(),
      bitbucket: new Set(),
    },
    mergedPrs: {
      github: new Map(),
      gitlab: new Map(),
      bitbucket: new Map(),
    },
    requests: {
      github: [],
      gitlab: [],
      bitbucket: [],
    },
    scenarios: {
      github: freshScenarioFlags(),
      gitlab: freshScenarioFlags(),
      bitbucket: freshScenarioFlags(),
    },
  };
}

export type ProviderId = "github" | "gitlab" | "bitbucket";
