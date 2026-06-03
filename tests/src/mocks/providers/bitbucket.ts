import type { Express, Request, Response } from "express";
import express from "express";

import type { MockState } from "./state";

/// Plan-8 Bitbucket Cloud mock server. Mirrors what
/// `app/src-tauri/src/providers/bitbucket.rs` hits in the merge + list
/// flows. Bitbucket Cloud uses Basic auth + workspace/repo URL shape and
/// has no rebase-on-merge endpoint (the merge handler rejects Rebase up
/// the stack before it reaches HTTP).

export function buildBitbucketApp(state: MockState): Express {
  const app = express();
  app.use(express.json({ strict: false }));

  app.use((req, _res, next) => {
    state.requests.bitbucket.push({
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });
    next();
  });

  app.use((req, res, next) => {
    const flags = state.scenarios.bitbucket;
    if (flags.rateLimitedUntil !== null && flags.rateLimitedUntil > Date.now()) {
      res.status(429).json({ error: { message: "Rate limited" } });
      return;
    }
    if (flags.authExpired) {
      res.status(401).json({ error: { message: "Unauthorized" } });
      return;
    }
    next();
  });

  app.get("/user", (_req, res) => {
    res.json({
      uuid: "{e2e-uuid}",
      account_id: "e2e",
      username: "e2e-tester",
      display_name: "E2E Tester",
      links: { avatar: { href: "https://avatars.example.com/bb-e2e-tester" } },
    });
  });

  app.get("/repositories/:workspace/:repo/pullrequests", (_req, res) => {
    const merged = state.mergedPrs.bitbucket;
    res.json({
      values: [
        buildPr(1, "Fix flaky test", "feature-x", "main", merged),
        buildPr(2, "Bump deps", "chore/deps", "main", merged),
      ],
      page: 1,
      pagelen: 50,
      size: 2,
    });
  });

  app.get("/repositories/:workspace/:repo/pullrequests/:n", (req, res) => {
    const n = Number(req.params.n);
    res.json(buildPr(n, "Fix flaky test", "feature-x", "main", state.mergedPrs.bitbucket));
  });

  app.post("/repositories/:workspace/:repo/pullrequests/:n/merge", (req, res) => {
    if (state.scenarios.bitbucket.mergeConflict) {
      res.status(409).json({ error: { message: "Pull request has conflicts" } });
      return;
    }
    const n = Number(req.params.n);
    const body = (req.body ?? {}) as {
      merge_strategy?: string;
      message?: string;
      close_source_branch?: boolean;
    };
    const valid = ["merge_commit", "squash", "fast_forward"];
    if (body.merge_strategy && !valid.includes(body.merge_strategy)) {
      res.status(400).json({ error: { message: "invalid merge_strategy" } });
      return;
    }
    const strategy = body.merge_strategy ?? "merge_commit";
    const sha = `mockmerge${n}bb`;
    state.mergedPrs.bitbucket.set(n, {
      strategy,
      sha,
      message: body.message ?? null,
    });
    if (body.close_source_branch) {
      state.deletedBranches.bitbucket.add("feature-x");
    }
    res.json({
      ...buildPr(n, "Fix flaky test", "feature-x", "main", state.mergedPrs.bitbucket),
      merge_commit: { hash: sha },
    });
  });

  app.use(unknownRouteHandler("bitbucket"));
  return app;
}

function buildPr(
  n: number,
  title: string,
  source: string,
  target: string,
  merged: Map<number, { strategy: string; sha: string; message: string | null }>,
) {
  const wasMerged = merged.get(n);
  return {
    id: n,
    type: "pullrequest",
    title,
    state: wasMerged ? "MERGED" : "OPEN",
    description: `body for PR ${n}`,
    source: {
      branch: { name: source },
      commit: { hash: `${source}sha` },
      repository: { full_name: "test-ws/test-repo" },
    },
    destination: {
      branch: { name: target },
      commit: { hash: `${target}sha` },
      repository: { full_name: "test-ws/test-repo" },
    },
    author: {
      uuid: "{e2e-uuid}",
      account_id: "e2e",
      display_name: "E2E Tester",
      links: { avatar: { href: "https://avatars.example.com/bb-e2e-tester" } },
    },
    reviewers: [],
    participants: [],
    links: {
      html: { href: `https://bitbucket.org/test-ws/test-repo/pull-requests/${n}` },
      diffstat: {
        href: `https://api.bitbucket.org/2.0/repositories/test-ws/test-repo/pullrequests/${n}/diffstat`,
      },
    },
    created_on: "2026-06-01T08:00:00Z",
    updated_on: "2026-06-02T08:00:00Z",
    comment_count: 0,
    task_count: 0,
    close_source_branch: false,
    merge_commit: wasMerged ? { hash: wasMerged.sha } : null,
  };
}

function unknownRouteHandler(label: string) {
  return (req: Request, res: Response) => {
    console.error(`[mock-${label}] no route for ${req.method} ${req.path}`);
    res.status(404).json({ error: { message: `mock-${label}: not stubbed` } });
  };
}
