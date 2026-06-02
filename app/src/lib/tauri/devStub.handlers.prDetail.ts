// Dev:web stub handler for PR detail + the Plan 03/04 provider-depth features
// (delegated to `devStub.providers.ts`).
import { DEV_PR_DETAIL_BODY, UNHANDLED, providerFeatureStub } from "@/lib/tauri/devStub.providers";
import type { DevStubState } from "@/lib/tauri/devStub.state";

type Args = Record<string, unknown>;

export function prDetailStub(
  cmd: string,
  a: Args,
  state: DevStubState,
): unknown | typeof UNHANDLED {
  const seed = state.seed;

  if (cmd === "get_pr_detail") {
    const repoId = a.repoId as string | undefined;
    const list = (seed.prs && repoId && seed.prs[repoId]) || [];
    const base = list.find((pr) => pr.number === a.prNumber);
    if (!base) return null;
    const body = DEV_PR_DETAIL_BODY;
    const t0 = Date.now() - 3 * 86_400_000;
    const timeline = [
      {
        id: "ev-open",
        type: "opened",
        actor: base.author,
        at: new Date(t0).toISOString(),
        body: null,
      },
      {
        id: "ev-commit",
        type: "commit",
        actor: base.author,
        at: new Date(t0 + 4 * 3_600_000).toISOString(),
        body: "Push `feat/landing-hero` → 3 commits",
      },
      {
        id: "ev-review",
        type: "review_requested",
        actor: "lea",
        at: new Date(t0 + 26 * 3_600_000).toISOString(),
        body: null,
      },
      {
        id: "ev-comment",
        type: "commented",
        actor: "lea",
        at: new Date(t0 + 28 * 3_600_000).toISOString(),
        body: "Looks great overall — a couple of nits inline.",
      },
    ];
    const reviewers = [
      { login: "lea", name: "Lea Ramirez", avatarUrl: null, state: "approved" as const },
      { login: "octocat", name: null, avatarUrl: null, state: "pending" as const },
    ];
    return { ...base, body, mergeable: true, reviewers, files: [], timeline };
  }

  if (
    cmd === "get_pr_diff" ||
    cmd === "post_pr_comment" ||
    cmd === "list_workflows" ||
    cmd === "list_workflow_runs" ||
    cmd === "trigger_workflow" ||
    cmd === "cancel_workflow_run" ||
    cmd === "get_pages_status"
  ) {
    const stub = providerFeatureStub(cmd, a);
    return stub === UNHANDLED ? undefined : stub;
  }

  return UNHANDLED;
}
