import type { RecentCommit } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { computeLeaderboard } from "@/lib/activityStats";

const TODAY = new Date("2026-05-24T12:00:00Z");

function commit(partial: Partial<RecentCommit> & { author: string }): RecentCommit {
  return {
    sha: partial.sha ?? `sha-${Math.random().toString(36).slice(2, 10)}`,
    summary: partial.summary ?? "test commit",
    author: partial.author,
    authorEmail: partial.authorEmail ?? null,
    timestamp: partial.timestamp ?? "2026-05-23T10:00:00Z",
    repoId: partial.repoId ?? "repo-1",
    repoName: partial.repoName ?? "repo-1",
  };
}

describe("computeLeaderboard", () => {
  it("merges identities with the same normalised name across different emails", () => {
    const commits: RecentCommit[] = [
      commit({ author: "Valentin Röhle", authorEmail: "valentin@example.com" }),
      commit({ author: "Valentin Roehle", authorEmail: "valentin.roehle@work.com" }),
      commit({ author: "valentin.roehle", authorEmail: null }),
    ];
    const result = computeLeaderboard(commits, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(3);
  });

  it("merges identities with the same email-local across different display names", () => {
    const commits: RecentCommit[] = [
      commit({ author: "Val", authorEmail: "valentin@example.com" }),
      commit({ author: "Valentin Röhle", authorEmail: "valentin@elsewhere.com" }),
    ];
    const result = computeLeaderboard(commits, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(2);
  });

  it("keeps unrelated authors in separate buckets", () => {
    const commits: RecentCommit[] = [
      commit({ author: "Valentin", authorEmail: "valentin@example.com" }),
      commit({ author: "Maren", authorEmail: "maren@example.com" }),
      commit({ author: "Tomi", authorEmail: "tomi@example.com" }),
    ];
    const result = computeLeaderboard(commits, TODAY);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.author).sort()).toEqual(["Maren", "Tomi", "Valentin"]);
  });

  it("honours manual authorAliases overrides over the auto-union", () => {
    const commits: RecentCommit[] = [
      commit({ author: "Valentin", authorEmail: "valentin@example.com" }),
      commit({ author: "Valentin", authorEmail: "valentin@example.com" }),
      commit({ author: "Bot Account", authorEmail: "bot@example.com" }),
    ];
    // Force-merge the bot into Valentin via an alias.
    const aliases = { "botaccount|bot": "valentin|valentin" };
    const result = computeLeaderboard(commits, TODAY, 5, aliases);
    expect(result).toHaveLength(1);
    expect(result[0]?.count).toBe(3);
  });

  it("picks the most frequent name variant as the display name", () => {
    const commits: RecentCommit[] = [
      commit({ author: "Valentin Röhle", authorEmail: "valentin@example.com" }),
      commit({ author: "Valentin Röhle", authorEmail: "valentin@example.com" }),
      commit({ author: "valentin.roehle", authorEmail: "valentin@example.com" }),
    ];
    const result = computeLeaderboard(commits, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]?.author).toBe("Valentin Röhle");
  });
});
