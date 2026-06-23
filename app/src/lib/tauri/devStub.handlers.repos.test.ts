import { ACTIVITY_COMMITS_CHUNK_EVENT, TauriCommand } from "@recrest/shared";

import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SEED } from "@/lib/dev/seed";
import { reposStub } from "@/lib/tauri/devStub.handlers.repos";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevSeed, createDevStubState } from "@/lib/tauri/devStub.state";

function makeState() {
  return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
}

function makeCtx() {
  return { emit: vi.fn() };
}

describe("reposStub", () => {
  // ─── sentinel ──────────────────────────────────────────────────────────────

  it("returns UNHANDLED for an unknown command", () => {
    const state = makeState();
    expect(reposStub("__no_such_command__", {}, state, makeCtx())).toBe(UNHANDLED);
  });

  // ─── scan_repos / list_repos ────────────────────────────────────────────────

  describe("scan_repos", () => {
    it("returns the full seed repo array", () => {
      const state = makeState();
      const result = reposStub("scan_repos", {}, state, makeCtx());
      expect(result).toBe(state.seed.repos);
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe("list_repos", () => {
    it("returns the full seed repo array (same object as scan_repos)", () => {
      const state = makeState();
      expect(reposStub("list_repos", {}, state, makeCtx())).toBe(state.seed.repos);
    });
  });

  // ─── repo_status ────────────────────────────────────────────────────────────

  describe("repo_status", () => {
    it("returns the matching repo when the id is found", () => {
      const state = makeState();
      const firstRepo = state.seed.repos[0]!;
      const result = reposStub("repo_status", { repoId: firstRepo.id }, state, makeCtx());
      expect(result).toEqual(firstRepo);
    });

    it("returns null when the id is not found", () => {
      const state = makeState();
      const result = reposStub("repo_status", { repoId: "no-such-repo" }, state, makeCtx());
      expect(result).toBeNull();
    });
  });

  // ─── add_repo ───────────────────────────────────────────────────────────────

  describe("add_repo", () => {
    it("returns a new repo object with the correct path and derived name", () => {
      const state = makeState();
      const result = reposStub(
        "add_repo",
        { path: "/home/dev/projects/my-app" },
        state,
        makeCtx(),
      ) as Record<string, unknown>;

      expect(typeof result.id).toBe("string");
      expect(result.id).toMatch(/^repo-/);
      expect(result.name).toBe("my-app");
      expect(result.path).toBe("/home/dev/projects/my-app");
      expect(result.groupId).toBeNull();
      expect(result.remoteUrl).toBeNull();
      expect(result.providerId).toBeNull();
    });

    it("falls back to 'repo' when path is empty", () => {
      const state = makeState();
      const result = reposStub("add_repo", { path: "" }, state, makeCtx()) as Record<
        string,
        unknown
      >;
      expect(result.name).toBe("repo");
      expect(result.path).toBe("");
    });

    it("picks up the optional groupId arg", () => {
      const state = makeState();
      const result = reposStub(
        "add_repo",
        { path: "/foo/bar", groupId: "open-source" },
        state,
        makeCtx(),
      ) as Record<string, unknown>;
      expect(result.groupId).toBe("open-source");
    });

    it("handles Windows-style backslash paths", () => {
      const state = makeState();
      const result = reposStub(
        "add_repo",
        { path: "C:\\Users\\dev\\my-repo" },
        state,
        makeCtx(),
      ) as Record<string, unknown>;
      expect(result.name).toBe("my-repo");
    });
  });

  // ─── remove_repo ────────────────────────────────────────────────────────────

  describe("remove_repo", () => {
    it("returns undefined", () => {
      const state = makeState();
      expect(
        reposStub("remove_repo", { repoId: "repo-recrest" }, state, makeCtx()),
      ).toBeUndefined();
    });
  });

  // ─── forget_repos_under_path ────────────────────────────────────────────────

  describe("forget_repos_under_path", () => {
    it("prunes repos under the removed path and returns their ids", () => {
      const state = makeState();
      // Add a repo that lives inside the removed root
      const originalCount = state.seed.repos.length;
      const fakeRepo = {
        id: "repo-test-prune",
        name: "test-prune",
        path: "/workspace/project-a",
        remoteUrl: null,
        sshKeyPath: null,
        logoPath: null,
        status: state.seed.repos[0]!.status,
      };
      state.seed.repos.push(fakeRepo as (typeof state.seed.repos)[number]);

      const result = reposStub(
        "forget_repos_under_path",
        { removedPath: "/workspace", remainingPaths: [] },
        state,
        makeCtx(),
      ) as string[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain("repo-test-prune");
      // pruned repo should be removed from state
      expect(state.seed.repos.find((r) => r.id === "repo-test-prune")).toBeUndefined();
      // other repos untouched
      expect(state.seed.repos.length).toBe(originalCount);
    });

    it("returns an empty array when nothing matches the removed path", () => {
      const state = makeState();
      const result = reposStub(
        "forget_repos_under_path",
        { removedPath: "/does/not/exist", remainingPaths: [] },
        state,
        makeCtx(),
      ) as string[];
      expect(result).toEqual([]);
    });

    it("skips repos that are still covered by a remainingPath", () => {
      const state = makeState();
      const fakeRepoA = {
        id: "repo-keep-a",
        name: "keep-a",
        path: "/workspace/keep",
        remoteUrl: null,
        sshKeyPath: null,
        logoPath: null,
        status: state.seed.repos[0]!.status,
      };
      const fakeRepoB = {
        id: "repo-remove-b",
        name: "remove-b",
        path: "/workspace/remove",
        remoteUrl: null,
        sshKeyPath: null,
        logoPath: null,
        status: state.seed.repos[0]!.status,
      };
      state.seed.repos.push(
        fakeRepoA as (typeof state.seed.repos)[number],
        fakeRepoB as (typeof state.seed.repos)[number],
      );

      const result = reposStub(
        "forget_repos_under_path",
        { removedPath: "/workspace", remainingPaths: ["/workspace/keep"] },
        state,
        makeCtx(),
      ) as string[];

      expect(result).not.toContain("repo-keep-a");
      expect(result).toContain("repo-remove-b");
    });
  });

  // ─── delete_repo ────────────────────────────────────────────────────────────

  describe("delete_repo", () => {
    it("returns undefined (no-op — no filesystem in dev:web)", () => {
      const state = makeState();
      expect(
        reposStub("delete_repo", { repoId: "repo-recrest" }, state, makeCtx()),
      ).toBeUndefined();
    });
  });

  // ─── list_recent_commits ────────────────────────────────────────────────────

  describe("list_recent_commits", () => {
    it("returns commits for a specific repo when repoId is given", () => {
      const state = makeState();
      const repoId = "repo-recrest";
      const result = reposStub("list_recent_commits", { repoId }, state, makeCtx()) as unknown[];
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      for (const c of result as Array<{ repoId: string }>) {
        expect(c.repoId).toBe(repoId);
      }
    });

    it("returns all commits (sorted desc) when no repoId is given", () => {
      const state = makeState();
      const result = reposStub("list_recent_commits", {}, state, makeCtx()) as Array<{
        timestamp: string;
      }>;
      expect(result.length).toBeGreaterThan(0);
      // verify descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1]!.timestamp >= result[i]!.timestamp).toBe(true);
      }
    });

    it("returns empty array for a repo with no commits", () => {
      const state = makeState();
      // Clear the recentCommits bucket for octo-notes
      state.seed.recentCommits["repo-octo-notes"] = [];
      const result = reposStub(
        "list_recent_commits",
        { repoId: "repo-octo-notes" },
        state,
        makeCtx(),
      );
      expect(result).toEqual([]);
    });
  });

  // ─── list_commits (TauriCommand.LIST_COMMITS) ───────────────────────────────

  describe(TauriCommand.LIST_COMMITS, () => {
    it("returns a summary with requestId, totals, and truncated maps", () => {
      const state = makeState();
      const ctx = makeCtx();
      const result = reposStub(
        TauriCommand.LIST_COMMITS,
        { requestId: "req-abc", since: undefined, until: undefined },
        state,
        ctx,
      ) as {
        requestId: string;
        totals: Record<string, number>;
        truncated: Record<string, boolean>;
      };

      expect(result.requestId).toBe("req-abc");
      expect(typeof result.totals).toBe("object");
      expect(typeof result.truncated).toBe("object");
    });

    it("emits ACTIVITY_COMMITS_CHUNK_EVENT for each repo that has commits in range", () => {
      const state = makeState();
      const ctx = makeCtx();
      reposStub(
        TauriCommand.LIST_COMMITS,
        { requestId: "req-xyz", since: undefined, until: undefined },
        state,
        ctx,
      );

      // At least one chunk per repo with data
      expect(ctx.emit).toHaveBeenCalled();
      const calls = ctx.emit.mock.calls as [string, { requestId: string; repoId: string }][];
      for (const [event, payload] of calls) {
        expect(event).toBe(ACTIVITY_COMMITS_CHUNK_EVENT);
        expect(payload.requestId).toBe("req-xyz");
        expect(typeof payload.repoId).toBe("string");
      }
    });

    it("emits chunks with done=true and truncated=false", () => {
      const state = makeState();
      const ctx = makeCtx();
      reposStub(
        TauriCommand.LIST_COMMITS,
        { requestId: "r1", since: undefined, until: undefined },
        state,
        ctx,
      );
      const calls = ctx.emit.mock.calls as [
        string,
        { done: boolean; truncated: boolean; commits: unknown[] },
      ][];
      for (const [, payload] of calls) {
        expect(payload.done).toBe(true);
        expect(payload.truncated).toBe(false);
        expect(Array.isArray(payload.commits)).toBe(true);
      }
    });

    it("does NOT emit when ctx is omitted", () => {
      const state = makeState();
      // should not throw, and we can verify the return shape
      const result = reposStub(
        TauriCommand.LIST_COMMITS,
        { requestId: "no-ctx" },
        state,
        // no ctx arg
      ) as { requestId: string };
      expect(result.requestId).toBe("no-ctx");
    });

    it("filters commits to the given since/until range", () => {
      const state = makeState();
      const ctx = makeCtx();
      // Request a very narrow future window — no commits should fall there
      const future = new Date(Date.now() + 1_000_000_000).toISOString();
      const result = reposStub(
        TauriCommand.LIST_COMMITS,
        { requestId: "empty", since: future, until: future },
        state,
        ctx,
      ) as { totals: Record<string, number> };

      // No repos should have commits in that future window
      for (const count of Object.values(result.totals)) {
        expect(count).toBe(0);
      }
      // Correspondingly no chunks emitted
      expect(ctx.emit).not.toHaveBeenCalled();
    });
  });

  // ─── get_oldest_commit_date ──────────────────────────────────────────────────

  describe(TauriCommand.GET_OLDEST_COMMIT_DATE, () => {
    it("returns an ISO string (the oldest commit date)", () => {
      const state = makeState();
      const result = reposStub(TauriCommand.GET_OLDEST_COMMIT_DATE, {}, state, makeCtx());
      expect(typeof result).toBe("string");
      expect(() => new Date(result as string).toISOString()).not.toThrow();
    });

    it("returns null when the seed has no commits", () => {
      const state = makeState();
      state.seed.recentCommits = {};
      const result = reposStub(TauriCommand.GET_OLDEST_COMMIT_DATE, {}, state, makeCtx());
      expect(result).toBeNull();
    });
  });

  // ─── list_pr_events ─────────────────────────────────────────────────────────

  describe("list_pr_events", () => {
    it("returns an array of event objects", () => {
      const state = makeState();
      const result = reposStub("list_pr_events", {}, state, makeCtx()) as unknown[];
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("scopes results to a specific repoId when provided", () => {
      const state = makeState();
      const repoId = "repo-recrest";
      const result = reposStub("list_pr_events", { repoId, days: 365 }, state, makeCtx()) as Array<{
        repoId: string;
      }>;
      for (const ev of result) {
        expect(ev.repoId).toBe(repoId);
      }
    });

    it("each event has the expected shape keys", () => {
      const state = makeState();
      const result = reposStub("list_pr_events", { days: 365 }, state, makeCtx()) as Array<
        Record<string, unknown>
      >;
      const ev = result[0]!;
      expect(ev).toHaveProperty("repoId");
      expect(ev).toHaveProperty("repoName");
      expect(ev).toHaveProperty("number");
      expect(ev).toHaveProperty("title");
      expect(ev).toHaveProperty("author");
      expect(ev).toHaveProperty("kind");
      expect(ev).toHaveProperty("timestamp");
    });
  });

  // ─── list_check_runs ────────────────────────────────────────────────────────

  describe("list_check_runs", () => {
    it("returns check-run objects for all repos when no repoId given", () => {
      const state = makeState();
      const result = reposStub("list_check_runs", {}, state, makeCtx()) as Array<
        Record<string, unknown>
      >;
      expect(result.length).toBeGreaterThan(0);
      const ev = result[0]!;
      expect(ev).toHaveProperty("repoId");
      expect(ev).toHaveProperty("day");
      expect(ev).toHaveProperty("total");
      expect(ev).toHaveProperty("passed");
      expect(ev).toHaveProperty("failed");
    });

    it("scopes to a single repo when repoId is given", () => {
      const state = makeState();
      const repoId = "repo-recrest";
      const result = reposStub("list_check_runs", { repoId }, state, makeCtx()) as Array<{
        repoId: string;
      }>;
      expect(result.length).toBeGreaterThan(0);
      for (const run of result) {
        expect(run.repoId).toBe(repoId);
      }
    });

    it("returns empty array when repoId does not match any repo", () => {
      const state = makeState();
      const result = reposStub("list_check_runs", { repoId: "no-such-repo" }, state, makeCtx());
      expect(result).toEqual([]);
    });
  });

  // ─── detect_ides ────────────────────────────────────────────────────────────

  describe("detect_ides", () => {
    it("returns an array containing 'vscode'", () => {
      const state = makeState();
      const result = reposStub("detect_ides", {}, state, makeCtx());
      expect(result).toEqual(["vscode"]);
    });
  });

  // ─── load_logo_bytes ────────────────────────────────────────────────────────

  describe("load_logo_bytes", () => {
    it("returns a LogoBlob for a known demo logo path", () => {
      const state = makeState();
      const result = reposStub(
        "load_logo_bytes",
        { path: "demo-pulse-icon.svg" },
        state,
        makeCtx(),
      ) as { mimeType: string; data: string } | null;
      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe("image/svg+xml");
      // data should be a non-empty base64 string
      expect(typeof result!.data).toBe("string");
      expect(result!.data.length).toBeGreaterThan(0);
    });

    it("returns null for an unknown logo path", () => {
      const state = makeState();
      const result = reposStub("load_logo_bytes", { path: "no-such-logo.png" }, state, makeCtx());
      expect(result).toBeNull();
    });

    it("returns null when path arg is missing", () => {
      const state = makeState();
      const result = reposStub("load_logo_bytes", {}, state, makeCtx());
      expect(result).toBeNull();
    });
  });

  // ─── open_in_ide / open_terminal / open_in_explorer ─────────────────────────

  describe.each(["open_in_ide", "open_terminal", "open_in_explorer"])("%s", (cmd) => {
    it("returns undefined", () => {
      const state = makeState();
      expect(reposStub(cmd, { repoId: "repo-recrest" }, state, makeCtx())).toBeUndefined();
    });
  });

  // ─── set_repo_ssh_key ────────────────────────────────────────────────────────

  describe("set_repo_ssh_key", () => {
    it("updates sshKeyPath on the matching repo", () => {
      const state = makeState();
      const repoId = state.seed.repos[0]!.id;
      reposStub(
        "set_repo_ssh_key",
        { repoId, keyPath: "/Users/dev/.ssh/id_ed25519" },
        state,
        makeCtx(),
      );
      const updated = state.seed.repos.find((r) => r.id === repoId);
      expect(updated!.sshKeyPath).toBe("/Users/dev/.ssh/id_ed25519");
    });

    it("sets sshKeyPath to null when keyPath is null", () => {
      const state = makeState();
      const repoId = state.seed.repos[0]!.id;
      // first set a key
      reposStub("set_repo_ssh_key", { repoId, keyPath: "/some/key" }, state, makeCtx());
      // then clear it
      reposStub("set_repo_ssh_key", { repoId, keyPath: null }, state, makeCtx());
      const updated = state.seed.repos.find((r) => r.id === repoId);
      expect(updated!.sshKeyPath).toBeNull();
    });

    it("is a no-op (and does not throw) when repoId is not found", () => {
      const state = makeState();
      const before = state.seed.repos.map((r) => r.sshKeyPath);
      reposStub("set_repo_ssh_key", { repoId: "ghost", keyPath: "/key" }, state, makeCtx());
      const after = state.seed.repos.map((r) => r.sshKeyPath);
      expect(after).toEqual(before);
    });

    it("returns undefined", () => {
      const state = makeState();
      const result = reposStub(
        "set_repo_ssh_key",
        { repoId: state.seed.repos[0]!.id, keyPath: "/key" },
        state,
        makeCtx(),
      );
      expect(result).toBeUndefined();
    });
  });

  // ─── set_repo_logo ──────────────────────────────────────────────────────────

  describe("set_repo_logo", () => {
    it("marks logoPath and logoIsCustom on the matching repo", () => {
      const state = makeState();
      const repoId = state.seed.repos[0]!.id;
      const result = reposStub(
        "set_repo_logo",
        { repoId, logoPath: "/some/image.png" },
        state,
        makeCtx(),
      ) as Record<string, unknown>;

      expect(result).not.toBeNull();
      expect(result.logoPath).toBe(`dev-stub://repo-logos/${repoId}`);
      expect(result.logoIsCustom).toBe(true);
      // state mutation mirrored
      const updated = state.seed.repos.find((r) => r.id === repoId);
      expect(updated!.logoIsCustom).toBe(true);
    });

    it("returns null when repoId is not found", () => {
      const state = makeState();
      const result = reposStub("set_repo_logo", { repoId: "ghost" }, state, makeCtx());
      expect(result).toBeNull();
    });
  });

  // ─── clear_repo_logo ────────────────────────────────────────────────────────

  describe("clear_repo_logo", () => {
    it("resets logoPath to null and logoIsCustom to false", () => {
      const state = makeState();
      const repoId = state.seed.repos[0]!.id;
      // first set a logo
      reposStub("set_repo_logo", { repoId }, state, makeCtx());
      // then clear it
      const result = reposStub("clear_repo_logo", { repoId }, state, makeCtx()) as Record<
        string,
        unknown
      >;
      expect(result.logoPath).toBeNull();
      expect(result.logoIsCustom).toBe(false);
      const updated = state.seed.repos.find((r) => r.id === repoId);
      expect(updated!.logoPath).toBeNull();
      expect(updated!.logoIsCustom).toBe(false);
    });

    it("returns null when repoId is not found", () => {
      const state = makeState();
      expect(reposStub("clear_repo_logo", { repoId: "ghost" }, state, makeCtx())).toBeNull();
    });
  });

  // ─── ssh_unlock_key ─────────────────────────────────────────────────────────

  describe("ssh_unlock_key", () => {
    it("returns undefined", () => {
      const state = makeState();
      expect(reposStub("ssh_unlock_key", {}, state, makeCtx())).toBeUndefined();
    });
  });

  // ─── list_ssh_keys ──────────────────────────────────────────────────────────

  describe("list_ssh_keys", () => {
    it("returns a dir string and a keys array with at least one key", () => {
      const state = makeState();
      const result = reposStub("list_ssh_keys", {}, state, makeCtx()) as {
        dir: string;
        keys: Array<{ path: string; name: string; hasPublic: boolean }>;
      };
      expect(typeof result.dir).toBe("string");
      expect(Array.isArray(result.keys)).toBe(true);
      expect(result.keys.length).toBeGreaterThan(0);
      const key = result.keys[0]!;
      expect(typeof key.path).toBe("string");
      expect(typeof key.name).toBe("string");
      expect(typeof key.hasPublic).toBe("boolean");
    });
  });

  // ─── find_across_repos ──────────────────────────────────────────────────────

  describe("find_across_repos", () => {
    it("returns empty array when query is shorter than 2 chars", () => {
      const state = makeState();
      expect(reposStub("find_across_repos", { query: "x" }, state, makeCtx())).toEqual([]);
      expect(reposStub("find_across_repos", { query: "" }, state, makeCtx())).toEqual([]);
    });

    it("returns hits across the first 3 repos when no repoId filter", () => {
      const state = makeState();
      const result = reposStub(
        "find_across_repos",
        { query: "useState" },
        state,
        makeCtx(),
      ) as Array<Record<string, unknown>>;
      expect(result.length).toBeGreaterThan(0);
      const hit = result[0]!;
      expect(hit).toHaveProperty("repoId");
      expect(hit).toHaveProperty("repoName");
      expect(hit).toHaveProperty("path");
      expect(hit).toHaveProperty("absolutePath");
      expect(hit).toHaveProperty("line");
      expect(hit).toHaveProperty("column");
      expect(hit).toHaveProperty("snippet");
    });

    it("scopes hits to one repo when repoId filter is given", () => {
      const state = makeState();
      const repoId = "repo-recrest";
      const result = reposStub(
        "find_across_repos",
        { query: "dispatch", repoId },
        state,
        makeCtx(),
      ) as Array<{ repoId: string }>;
      expect(result.length).toBeGreaterThan(0);
      for (const hit of result) {
        expect(hit.repoId).toBe(repoId);
      }
    });

    it("snippet contains the query term", () => {
      const state = makeState();
      const query = "myFancyQuery";
      const result = reposStub("find_across_repos", { query }, state, makeCtx()) as Array<{
        snippet: string;
      }>;
      for (const hit of result) {
        expect(hit.snippet).toContain(query);
      }
    });
  });

  // ─── open_file_in_ide ────────────────────────────────────────────────────────

  describe("open_file_in_ide", () => {
    it("returns undefined", () => {
      const state = makeState();
      expect(
        reposStub(
          "open_file_in_ide",
          { repoId: "repo-recrest", path: "src/index.ts" },
          state,
          makeCtx(),
        ),
      ).toBeUndefined();
    });
  });
});
