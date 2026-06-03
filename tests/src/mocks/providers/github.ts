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

  // ----- PR diff (Plan-10 mr-diff spec) ---------------------------------
  app.get("/repos/:owner/:repo/pulls/:n/files", (_req, res) => {
    res.json([
      {
        filename: "src/lib.ts",
        status: "modified",
        additions: 4,
        deletions: 1,
        blob_url: "https://github.com/test/test/blob/sha/src/lib.ts",
        patch:
          "@@ -1,3 +1,6 @@\n context-line\n-removed-line\n+added-1\n+added-2\n+added-3\n+added-4\n",
      },
      {
        filename: "README.md",
        status: "added",
        additions: 2,
        deletions: 0,
        blob_url: "https://github.com/test/test/blob/sha/README.md",
        patch: "@@ -0,0 +1,2 @@\n+new line 1\n+new line 2\n",
      },
    ]);
  });

  // ----- PR review comment (Plan-10 mr-diff spec) -----------------------
  app.post("/repos/:owner/:repo/pulls/:n/comments", (req, res) => {
    const body = (req.body ?? {}) as {
      body?: string;
      path?: string;
      line?: number;
      side?: string;
      commit_id?: string;
    };
    res.status(201).json({
      id: 9001,
      body: body.body ?? "",
      path: body.path ?? null,
      created_at: "2026-06-03T12:00:00Z",
      user: { login: "e2e-tester", avatar_url: "https://avatars.example.com/e2e-tester", id: 1 },
    });
  });

  // ----- CI workflows (Plan-10 ci-tab spec) -----------------------------
  app.get("/repos/:owner/:repo/actions/workflows", (_req, res) => {
    res.json({
      workflows: [
        { id: 101, name: "CI", path: ".github/workflows/ci.yml", state: "active" },
        { id: 102, name: "Release", path: ".github/workflows/release.yml", state: "active" },
      ],
    });
  });

  // YAML content fetched per workflow to extract `workflow_dispatch.inputs`.
  // Base64-encoded (`encoding: base64`) per the Contents API contract.
  app.get("/repos/:owner/:repo/contents/*", (req, res) => {
    const filePath = req.path.split("/contents/")[1] ?? "";
    const yaml = state.scenarios.github.workflowInputsRequired
      ? [
          "name: CI",
          "on:",
          "  workflow_dispatch:",
          "    inputs:",
          "      environment:",
          "        description: target env",
          "        required: true",
          "        type: choice",
          "        options: [staging, production]",
          "      version:",
          "        description: version tag",
          "        required: true",
          "        type: string",
          "",
        ].join("\n")
      : ["name: CI", "on: [push]", ""].join("\n");
    res.json({
      name: filePath.split("/").pop() ?? "ci.yml",
      path: filePath,
      content: Buffer.from(yaml, "utf8").toString("base64"),
      encoding: "base64",
    });
  });

  app.get("/repos/:owner/:repo/actions/workflows/:id/runs", (_req, res) => {
    res.json({
      workflow_runs: [
        {
          id: 5001,
          run_number: 42,
          status: "completed",
          conclusion: "success",
          head_sha: "feedface",
          created_at: "2026-06-02T08:00:00Z",
          html_url: "https://github.com/test/test/actions/runs/5001",
          actor: {
            login: "e2e-tester",
            avatar_url: "https://avatars.example.com/e2e-tester",
            id: 1,
          },
        },
      ],
    });
  });

  app.post("/repos/:owner/:repo/actions/workflows/:id/dispatches", (_req, res) => {
    if (state.scenarios.github.workflowDispatch404) {
      res.status(404).json({ message: "Not Found" });
      return;
    }
    res.status(204).end();
  });

  app.post("/repos/:owner/:repo/actions/runs/:run_id/cancel", (_req, res) => {
    res.status(202).json({ message: "cancellation requested" });
  });

  // ----- Pages (Plan-10 pages-deploy spec) ------------------------------
  app.get("/repos/:owner/:repo/pages", (_req, res) => {
    if (state.scenarios.github.pagesDisabled) {
      res.status(404).json({ message: "Not Found" });
      return;
    }
    res.json({
      html_url: "https://test-org.github.io/test-repo/",
      status: "built",
      cname: "docs.example.com",
    });
  });

  app.get("/repos/:owner/:repo/pages/builds/latest", (_req, res) => {
    if (state.scenarios.github.pagesDisabled) {
      res.status(404).json({ message: "Not Found" });
      return;
    }
    res.json({
      created_at: "2026-06-01T08:00:00Z",
      updated_at: "2026-06-01T08:05:00Z",
    });
  });

  // ----- Orgs (Plan-10 provider-depth orgs filter spec) -----------------
  app.get("/user/orgs", (_req, res) => {
    res.json([
      { id: 9001, login: "acme", avatar_url: "https://avatars.example.com/acme" },
      { id: 9002, login: "globex", avatar_url: "https://avatars.example.com/globex" },
    ]);
  });

  app.get("/orgs/:org/repos", (req, res) => {
    res.json([
      {
        id: 1,
        name: `${req.params.org}-repo-a`,
        full_name: `${req.params.org}/${req.params.org}-repo-a`,
        description: null,
        default_branch: "main",
        private: false,
        fork: false,
        archived: false,
        clone_url: `https://github.com/${req.params.org}/${req.params.org}-repo-a.git`,
        ssh_url: `git@github.com:${req.params.org}/${req.params.org}-repo-a.git`,
        html_url: `https://github.com/${req.params.org}/${req.params.org}-repo-a`,
        updated_at: "2026-06-01T08:00:00Z",
        pushed_at: "2026-06-01T08:00:00Z",
        size: 100,
        language: "TypeScript",
        owner: {
          login: req.params.org,
          avatar_url: `https://avatars.example.com/${req.params.org}`,
          id: 9001,
        },
      },
    ]);
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
