import { describe, expect, it } from "vitest";

import { DEFAULT_SEED } from "@/lib/dev/seed";
import { prDetailStub } from "@/lib/tauri/devStub.handlers.prDetail";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevSeed, createDevStubState } from "@/lib/tauri/devStub.state";

function makeState() {
  return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
}

// ---------------------------------------------------------------------------
// get_pr_detail
// ---------------------------------------------------------------------------

describe("prDetailStub / get_pr_detail", () => {
  it("returns null when the repoId has no PRs in the seed", () => {
    const state = makeState();
    const result = prDetailStub("get_pr_detail", { repoId: "repo-ledger-api", prNumber: 1 }, state);
    expect(result).toBeNull();
  });

  it("returns null when prNumber does not match any PR in the list", () => {
    const state = makeState();
    const result = prDetailStub("get_pr_detail", { repoId: "repo-recrest", prNumber: 9999 }, state);
    expect(result).toBeNull();
  });

  it("returns null when repoId is undefined", () => {
    const state = makeState();
    const result = prDetailStub("get_pr_detail", { prNumber: 41 }, state);
    expect(result).toBeNull();
  });

  it("returns a detail object for a known PR", () => {
    const state = makeState();
    const result = prDetailStub("get_pr_detail", { repoId: "repo-recrest", prNumber: 41 }, state);
    expect(result).not.toBeNull();
    const detail = result as Record<string, unknown>;
    expect(detail.number).toBe(41);
    expect(detail.title).toBe("feat(landing): realistic hero demo with DE/EN copy");
  });

  it("spreads all base PR fields into the detail", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    expect(result).toHaveProperty("id", "pr-recrest-41");
    expect(result).toHaveProperty("author");
    expect(result).toHaveProperty("state");
    expect(result).toHaveProperty("sourceBranch");
    expect(result).toHaveProperty("targetBranch");
  });

  it("includes a non-empty body string", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    expect(typeof result.body).toBe("string");
    expect((result.body as string).length).toBeGreaterThan(0);
  });

  it("has mergeable: true", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    expect(result.mergeable).toBe(true);
  });

  it("has exactly two reviewers with the expected logins", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    const reviewers = result.reviewers as Array<Record<string, unknown>>;
    expect(reviewers).toHaveLength(2);
    expect(reviewers[0]?.login).toBe("lea");
    expect(reviewers[0]?.state).toBe("approved");
    expect(reviewers[1]?.login).toBe("octocat");
    expect(reviewers[1]?.state).toBe("pending");
  });

  it("has an empty files array", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    expect(result.files).toEqual([]);
  });

  it("includes a timeline with 4 events in chronological order", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    const timeline = result.timeline as Array<Record<string, unknown>>;
    expect(timeline).toHaveLength(4);
    expect(timeline[0]?.type).toBe("opened");
    expect(timeline[1]?.type).toBe("commit");
    expect(timeline[2]?.type).toBe("review_requested");
    expect(timeline[3]?.type).toBe("commented");
  });

  it("timeline events have id, type, actor, at, body fields", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    const timeline = result.timeline as Array<Record<string, unknown>>;
    for (const ev of timeline) {
      expect(ev).toHaveProperty("id");
      expect(ev).toHaveProperty("type");
      expect(ev).toHaveProperty("actor");
      expect(ev).toHaveProperty("at");
      expect(ev).toHaveProperty("body");
    }
  });

  it("timeline 'at' values are ISO date strings in ascending order", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-recrest", prNumber: 41 },
      state,
    ) as Record<string, unknown>;
    const timeline = result.timeline as Array<Record<string, unknown>>;
    const timestamps = timeline.map((ev) => new Date(ev.at as string).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]!).toBeGreaterThan(timestamps[i - 1]!);
    }
  });

  it("works for a PR in a different repo (repo-signal-lab #9)", () => {
    const state = makeState();
    const result = prDetailStub(
      "get_pr_detail",
      { repoId: "repo-signal-lab", prNumber: 9 },
      state,
    ) as Record<string, unknown>;
    expect(result).not.toBeNull();
    expect(result.number).toBe(9);
    expect(result.id).toBe("pr-signal-9");
  });
});

// ---------------------------------------------------------------------------
// merge_pull_request
// ---------------------------------------------------------------------------

describe("prDetailStub / merge_pull_request", () => {
  it("returns merged: true", () => {
    const state = makeState();
    const result = prDetailStub(
      "merge_pull_request",
      { prNumber: 41, input: { strategy: "squash", deleteSourceBranch: true } },
      state,
    ) as Record<string, unknown>;
    expect(result.merged).toBe(true);
  });

  it("includes the prNumber in mergeSha", () => {
    const state = makeState();
    const result = prDetailStub(
      "merge_pull_request",
      { prNumber: 41, input: { strategy: "squash" } },
      state,
    ) as Record<string, unknown>;
    expect(result.mergeSha).toBe("devstub41");
  });

  it("falls back to prNumber 0 when prNumber is undefined", () => {
    const state = makeState();
    const result = prDetailStub(
      "merge_pull_request",
      { input: { strategy: "merge" } },
      state,
    ) as Record<string, unknown>;
    expect(result.mergeSha).toBe("devstub0");
  });

  it("reflects deleteSourceBranch: true in sourceBranchDeleted", () => {
    const state = makeState();
    const result = prDetailStub(
      "merge_pull_request",
      { prNumber: 41, input: { deleteSourceBranch: true } },
      state,
    ) as Record<string, unknown>;
    expect(result.sourceBranchDeleted).toBe(true);
  });

  it("sourceBranchDeleted is false when deleteSourceBranch is omitted", () => {
    const state = makeState();
    const result = prDetailStub("merge_pull_request", { prNumber: 41, input: {} }, state) as Record<
      string,
      unknown
    >;
    expect(result.sourceBranchDeleted).toBe(false);
  });

  it("includes strategy in message (squash)", () => {
    const state = makeState();
    const result = prDetailStub(
      "merge_pull_request",
      { prNumber: 41, input: { strategy: "squash" } },
      state,
    ) as Record<string, unknown>;
    expect(result.message).toContain("squash");
  });

  it("falls back to 'merge' strategy when not supplied", () => {
    const state = makeState();
    const result = prDetailStub("merge_pull_request", { prNumber: 41, input: {} }, state) as Record<
      string,
      unknown
    >;
    expect(result.message).toContain("merge");
  });

  it("handles null input gracefully", () => {
    const state = makeState();
    const result = prDetailStub("merge_pull_request", { prNumber: 5 }, state) as Record<
      string,
      unknown
    >;
    expect(result.merged).toBe(true);
    expect(result.mergeSha).toBe("devstub5");
  });
});

// ---------------------------------------------------------------------------
// Delegated provider-feature commands
// ---------------------------------------------------------------------------

describe("prDetailStub / delegated provider commands", () => {
  const providerCmds = [
    "get_pr_diff",
    "post_pr_comment",
    "list_workflows",
    "list_workflow_runs",
    "trigger_workflow",
    "cancel_workflow_run",
    "get_pages_status",
  ] as const;

  for (const cmd of providerCmds) {
    it(`does not return UNHANDLED for '${cmd}'`, () => {
      const state = makeState();
      // Pass minimal args sufficient for each command — the stub ignores most of them
      const args: Record<string, unknown> =
        cmd === "post_pr_comment" ? { body: "test", path: null, position: null } : {};
      const result = prDetailStub(cmd, args, state);
      expect(result).not.toBe(UNHANDLED);
    });
  }

  it("cancel_workflow_run resolves to undefined (not UNHANDLED)", () => {
    const state = makeState();
    const result = prDetailStub("cancel_workflow_run", {}, state);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Unknown command — must return UNHANDLED
// ---------------------------------------------------------------------------

describe("prDetailStub / unknown command", () => {
  it("returns UNHANDLED for an unrecognized command", () => {
    const state = makeState();
    const result = prDetailStub("totally_unknown_command", {}, state);
    expect(result).toBe(UNHANDLED);
  });
});
