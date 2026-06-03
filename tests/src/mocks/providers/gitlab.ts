import type { Express, Request, Response } from "express";
import express from "express";

import type { MockState } from "./state";

/// Plan-8 GitLab mock server. Mirrors the routes the Rust client at
/// `app/src-tauri/src/providers/gitlab.rs` hits in wdio-driven flows.
/// GitLab encodes the project path (e.g. `owner%2Frepo`) into the URL —
/// Express routes use the regex form so we match either shape.

export function buildGitlabApp(state: MockState): Express {
  const app = express();
  app.use(express.json({ strict: false }));

  app.use((req, _res, next) => {
    state.requests.gitlab.push({
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });
    next();
  });

  app.use((req, res, next) => {
    const flags = state.scenarios.gitlab;
    if (flags.rateLimitedUntil !== null && flags.rateLimitedUntil > Date.now()) {
      res.status(429).json({ message: "429 Too Many Requests" });
      return;
    }
    if (flags.authExpired) {
      res.status(401).json({ message: "401 Unauthorized" });
      return;
    }
    next();
  });

  app.get("/user", (_req, res) => {
    res.json({
      id: 1,
      username: "e2e-tester",
      name: "E2E Tester",
      avatar_url: "https://avatars.example.com/gl-e2e-tester",
    });
  });

  app.get("/projects/:enc/merge_requests", (_req, res) => {
    const merged = state.mergedPrs.gitlab;
    res.json([
      buildMr(1, "Fix flaky test", "feature-x", "main", merged),
      buildMr(2, "Bump deps", "chore/deps", "main", merged),
    ]);
  });

  app.get("/projects/:enc/merge_requests/:n", (req, res) => {
    const n = Number(req.params.n);
    const flags = state.scenarios.gitlab;
    const merged = state.mergedPrs.gitlab.get(n);
    const baseMr = buildMr(n, "Fix flaky test", "feature-x", "main", state.mergedPrs.gitlab);
    // The Rust rebase-poll loop reads `rebase_in_progress` on this endpoint.
    // Honor the stuck-forever scenario, otherwise return false so the
    // polling loop exits on the first iteration.
    res.json({ ...baseMr, rebase_in_progress: flags.rebaseStuckForever && !merged });
  });

  app.put("/projects/:enc/merge_requests/:n/rebase", (_req, res) => {
    res.status(202).json({ rebase_in_progress: true });
  });

  app.put("/projects/:enc/merge_requests/:n/merge", (req, res) => {
    if (state.scenarios.gitlab.mergeConflict) {
      res.status(406).json({ message: "Branch cannot be merged" });
      return;
    }
    const n = Number(req.params.n);
    const body = (req.body ?? {}) as {
      squash?: boolean;
      should_remove_source_branch?: boolean;
      merge_commit_message?: string;
    };
    const strategy = body.squash ? "squash" : "merge";
    const sha = `mockmerge${n}gl`;
    state.mergedPrs.gitlab.set(n, {
      strategy,
      sha,
      message: body.merge_commit_message ?? null,
    });
    if (
      body.should_remove_source_branch &&
      !state.scenarios.gitlab.deleteSucceedsButBranchSurvives
    ) {
      state.deletedBranches.gitlab.add("feature-x");
    }
    res.json({
      id: 4242,
      iid: n,
      state: "merged",
      merge_commit_sha: sha,
      sha,
      title: "Fix flaky test",
      source_branch: "feature-x",
      target_branch: "main",
    });
  });

  app.get("/projects/:enc/repository/branches/:branch", (req, res) => {
    if (state.deletedBranches.gitlab.has(req.params.branch)) {
      res.status(404).json({ message: "404 Branch Not Found" });
      return;
    }
    res.json({
      name: req.params.branch,
      commit: { id: "deadbeef", short_id: "deadbee" },
      protected: state.scenarios.gitlab.deleteSucceedsButBranchSurvives,
    });
  });

  app.use(unknownRouteHandler("gitlab"));
  return app;
}

function buildMr(
  n: number,
  title: string,
  source: string,
  target: string,
  merged: Map<number, { strategy: string; sha: string; message: string | null }>,
) {
  const wasMerged = merged.get(n);
  return {
    id: 1000 + n,
    iid: n,
    title,
    state: wasMerged ? "merged" : "opened",
    merge_commit_sha: wasMerged?.sha ?? null,
    squash_commit_sha: wasMerged?.strategy === "squash" ? wasMerged.sha : null,
    description: `body for MR ${n}`,
    source_branch: source,
    target_branch: target,
    author: {
      id: 1,
      username: "e2e-tester",
      name: "E2E Tester",
      avatar_url: "https://avatars.example.com/gl-e2e-tester",
    },
    assignees: [],
    reviewers: [],
    labels: [],
    draft: false,
    work_in_progress: false,
    web_url: `https://gitlab.com/test-org/test-repo/-/merge_requests/${n}`,
    created_at: "2026-06-01T08:00:00Z",
    updated_at: "2026-06-02T08:00:00Z",
    merged_at: wasMerged ? "2026-06-03T12:00:00Z" : null,
    user_notes_count: 0,
    upvotes: 0,
    downvotes: 0,
    rebase_in_progress: false,
  };
}

function unknownRouteHandler(label: string) {
  return (req: Request, res: Response) => {
    console.error(`[mock-${label}] no route for ${req.method} ${req.path}`);
    res.status(404).json({ message: `mock-${label}: not stubbed` });
  };
}
