import type { Express, Request, Response } from "express";
import express from "express";

import type { MockState } from "./state";

/// Plan-8 GitHub mock server. Covers the routes the Rust client at
/// `app/src-tauri/src/providers/github.rs` actually hits in the flows
/// wdio specs exercise:
///   - GET /user                                      (auth probe)
///   - GET /repos/:owner/:repo/pulls                  (PR list)
///   - GET /repos/:owner/:repo/pulls/:n               (PR detail)
///   - PUT /repos/:owner/:repo/pulls/:n/merge         (merge action)
///   - DELETE /repos/:owner/:repo/git/refs/heads/:b   (branch delete)
///   - GET /repos/:owner/:repo/git/refs/heads/:b      (branch existence
///     check after merge — Plan-7 protected-branch path)
///
/// Other endpoints fall through to a 404 with a `[mock-github] no route`
/// log line so missing stubs surface as a clear failure rather than a
/// silent deserialize error in the Rust client.

export function buildGithubApp(state: MockState): Express {
  const app = express();
  app.use(express.json({ strict: false }));

  app.use((req, _res, next) => {
    state.requests.github.push({
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });
    next();
  });

  app.use((req, res, next) => {
    const flags = state.scenarios.github;
    if (flags.rateLimitedUntil !== null && flags.rateLimitedUntil > Date.now()) {
      res.status(429).json({
        message: "API rate limit exceeded",
        documentation_url: "https://docs.github.com/rest/overview/rate-limits",
      });
      return;
    }
    if (flags.authExpired) {
      res.status(401).json({ message: "Bad credentials" });
      return;
    }
    next();
  });

  app.get("/user", (_req, res) => {
    res.json({
      login: "e2e-tester",
      id: 1,
      avatar_url: "https://avatars.example.com/e2e-tester",
      name: "E2E Tester",
    });
  });

  app.get("/repos/:owner/:repo/pulls", (req, res) => {
    const { owner, repo } = req.params;
    const merged = state.mergedPrs.github;
    res.json([
      buildPr(owner, repo, 1, "Fix flaky test", "feature-x", "main", merged),
      buildPr(owner, repo, 2, "Bump deps", "chore/deps", "main", merged),
    ]);
  });

  app.get("/repos/:owner/:repo/pulls/:n", (req, res) => {
    const n = Number(req.params.n);
    const { owner, repo } = req.params;
    res.json(
      buildPr(owner, repo, n, "Fix flaky test", "feature-x", "main", state.mergedPrs.github),
    );
  });

  app.put("/repos/:owner/:repo/pulls/:n/merge", (req, res) => {
    if (state.scenarios.github.mergeConflict) {
      res.status(405).json({
        message: "Pull Request is not mergeable",
        documentation_url: "https://docs.github.com/rest/pulls/pulls#merge-a-pull-request",
      });
      return;
    }
    const n = Number(req.params.n);
    const body = (req.body ?? {}) as {
      merge_method?: string;
      commit_title?: string;
      commit_message?: string;
    };
    const valid = ["merge", "squash", "rebase"];
    if (!body.merge_method || !valid.includes(body.merge_method)) {
      res.status(400).json({ message: "invalid merge_method" });
      return;
    }
    const sha = `mockmerge${n}gh`;
    state.mergedPrs.github.set(n, {
      strategy: body.merge_method,
      sha,
      message: body.commit_message ?? body.commit_title ?? null,
    });
    res.json({
      sha,
      merged: true,
      message: "Pull Request successfully merged",
    });
  });

  app.delete("/repos/:owner/:repo/git/refs/heads/:branch", (req, res) => {
    state.deletedBranches.github.add(req.params.branch);
    res.status(204).end();
  });

  app.get("/repos/:owner/:repo/git/refs/heads/:branch", (req, res) => {
    if (state.deletedBranches.github.has(req.params.branch)) {
      res.status(404).json({ message: "Not Found" });
      return;
    }
    res.json({
      ref: `refs/heads/${req.params.branch}`,
      object: { sha: "deadbeef", type: "commit" },
    });
  });

  app.use(unknownRouteHandler("github"));
  return app;
}

function buildPr(
  owner: string,
  repo: string,
  n: number,
  title: string,
  head: string,
  base: string,
  merged: Map<number, { strategy: string; sha: string; message: string | null }>,
) {
  const wasMerged = merged.get(n);
  return {
    number: n,
    title,
    state: wasMerged ? "closed" : "open",
    merged: !!wasMerged,
    merged_at: wasMerged ? "2026-06-03T12:00:00Z" : null,
    merge_commit_sha: wasMerged?.sha ?? null,
    html_url: `https://github.com/${owner}/${repo}/pull/${n}`,
    body: `body for PR ${n}`,
    head: { ref: head, sha: `${head}sha`, repo: { name: repo } },
    base: { ref: base, sha: `${base}sha`, repo: { name: repo } },
    user: {
      login: "e2e-tester",
      avatar_url: "https://avatars.example.com/e2e-tester",
      id: 1,
    },
    draft: false,
    requested_reviewers: [],
    assignees: [],
    labels: [],
    additions: 12,
    deletions: 3,
    changed_files: 2,
    comments: 0,
    review_comments: 0,
    commits: 1,
    mergeable: !wasMerged,
    mergeable_state: wasMerged ? "merged" : "clean",
    created_at: "2026-06-01T08:00:00Z",
    updated_at: "2026-06-02T08:00:00Z",
    closed_at: wasMerged ? "2026-06-03T12:00:00Z" : null,
  };
}

function unknownRouteHandler(label: string) {
  return (req: Request, res: Response) => {
    console.error(`[mock-${label}] no route for ${req.method} ${req.path}`);
    res.status(404).json({ message: `mock-${label}: not stubbed` });
  };
}
