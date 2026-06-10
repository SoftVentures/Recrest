// Pure resolvers for the dev:web Tauri stub. Each takes the seed (and
// optional repo filter) and returns synthesised data shaped like the real
// Tauri command would, so dashboard widgets / activity hooks render
// realistically without a live backend.
import { PrEventKind, PrState } from "@recrest/shared";

import type { DevSeed } from "@/lib/tauri/devStub.state";

export function resolveStatus(seed: DevSeed, repoId?: string) {
  const repo = seed.repos.find((r) => r.id === repoId);
  return repo ? repo.status : null;
}

export function resolveRecentCommits(seed: DevSeed, args: { repoId?: string } | undefined) {
  const repoId = args?.repoId;
  const buckets = seed.recentCommits || {};
  if (repoId) return buckets[repoId] || [];
  const all: Array<{ timestamp: string }> = [];
  for (const id of Object.keys(buckets)) {
    for (const c of buckets[id] || []) all.push(c);
  }
  all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return all;
}

/** Flatten the seed's recent-commit buckets to `[repoId, RecentCommit[]]`
 *  pairs filtered to `since <= timestamp <= until`. Mirrors the source used by
 *  `resolveRecentCommits` so the dev:web Activity range view stays consistent
 *  with the dashboard recent-commit feed. */
export function resolveCommitsInRange(
  seed: DevSeed,
  args: { since?: string; until?: string; maxCommitsPerRepo?: number } | undefined,
): Array<{ repoId: string; commits: Array<{ timestamp: string }> }> {
  const sinceMs = args?.since ? Date.parse(args.since) : Number.NEGATIVE_INFINITY;
  const untilMs = args?.until ? Date.parse(args.until) : Number.POSITIVE_INFINITY;
  const cap = args?.maxCommitsPerRepo;
  const buckets = seed.recentCommits || {};
  const out: Array<{ repoId: string; commits: Array<{ timestamp: string }> }> = [];
  for (const repoId of Object.keys(buckets)) {
    const inRange = (buckets[repoId] || []).filter((c) => {
      const ts = Date.parse(c.timestamp);
      return ts >= sinceMs && ts <= untilMs;
    });
    const commits = typeof cap === "number" ? inRange.slice(0, cap) : inRange;
    if (commits.length > 0) out.push({ repoId, commits });
  }
  return out;
}

/** Oldest commit timestamp across every seed repo as an ISO string, or null
 *  when the seed has no commits. Backs `get_oldest_commit_date`. */
export function resolveOldestCommitDate(seed: DevSeed): string | null {
  const buckets = seed.recentCommits || {};
  let oldest: number | null = null;
  for (const repoId of Object.keys(buckets)) {
    for (const c of buckets[repoId] || []) {
      const ts = Date.parse(c.timestamp);
      if (!Number.isNaN(ts) && (oldest === null || ts < oldest)) oldest = ts;
    }
  }
  return oldest === null ? null : new Date(oldest).toISOString();
}

export function resolvePrEvents(
  seed: DevSeed,
  args: { repoId?: string; days?: number } | undefined,
) {
  const days = args?.days || 14;
  const cutoffMs = Date.now() - days * 86_400_000;
  const out: Array<Record<string, unknown>> = [];
  const prsByRepo = seed.prs || {};
  const filterRepoId = args?.repoId;
  for (const [repoId, prs] of Object.entries(prsByRepo)) {
    if (filterRepoId && repoId !== filterRepoId) continue;
    const repo = seed.repos.find((r) => r.id === repoId);
    if (!repo) continue;
    for (const pr of prs) {
      const createdMs = new Date(pr.createdAt).getTime();
      if (createdMs >= cutoffMs) {
        out.push({
          repoId,
          repoName: repo.name,
          number: pr.number,
          title: pr.title,
          author: pr.author,
          url: pr.url,
          timestamp: pr.createdAt,
          kind: PrEventKind.OPENED,
        });
      }
      if ((pr.state === PrState.MERGED || pr.state === PrState.CLOSED) && pr.updatedAt) {
        const mergedMs = new Date(pr.updatedAt).getTime();
        if (mergedMs >= cutoffMs) {
          out.push({
            repoId,
            repoName: repo.name,
            number: pr.number,
            title: pr.title,
            author: pr.author,
            url: pr.url,
            timestamp: pr.updatedAt,
            kind: pr.state === PrState.MERGED ? PrEventKind.MERGED : PrEventKind.CLOSED,
          });
        }
      }
    }
  }
  const nowMs = Date.now();
  for (let d = 1; d < days; d++) {
    if (d % 2 === 0) continue;
    const ts = new Date(nowMs - d * 86_400_000 - 3_600_000 * (d % 5)).toISOString();
    const repoIdx = d % seed.repos.length;
    const repo = seed.repos[repoIdx];
    if (!repo) continue;
    if (filterRepoId && repo.id !== filterRepoId) continue;
    const num = 900 + d;
    const title = "chore: weekly cleanup " + d;
    const url = (repo.remoteUrl || "https://example.com") + "/pull/" + num;
    out.push({
      repoId: repo.id,
      repoName: repo.name,
      number: num,
      title,
      author: "sasha",
      url,
      timestamp: new Date(nowMs - (d + 1) * 86_400_000).toISOString(),
      kind: "opened",
    });
    out.push({
      repoId: repo.id,
      repoName: repo.name,
      number: num,
      title,
      author: "sasha",
      url,
      timestamp: ts,
      kind: "merged",
    });
  }
  return out;
}

export function resolveCheckRuns(seed: DevSeed, args: { repoId?: string } | undefined) {
  // The Activity page hook calls this without a `repoId` (it passes
  // `{ commits: [...] }` instead) — fan out across every seed repo so the
  // CI Health / Pass Rate / Flaky cards actually have data to render.
  const repoId = args?.repoId;
  const repos = repoId ? seed.repos.filter((r) => r.id === repoId) : seed.repos;
  if (repos.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: Array<Record<string, unknown>> = [];
  for (const repo of repos) {
    let h = 0;
    for (let i = 0; i < repo.id.length; i++) h = (h * 31 + repo.id.charCodeAt(i)) >>> 0;
    for (let d = 0; d < 14; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - d);
      const dayStr = day.toISOString().slice(0, 10);
      const seedA = ((h ^ (d * 2654435761)) >>> 0) % 100;
      if (seedA < 15) continue;
      const total = 2 + (seedA % 6);
      const failed = seedA < 30 ? seedA % 3 : 0;
      const passed = Math.max(0, total - failed);
      out.push({
        repoId: repo.id,
        repoName: repo.name,
        day: dayStr,
        commitSha: repo.status.head || "00000000",
        total,
        passed,
        failed,
        neutral: 0,
        pending: 0,
      });
    }
  }
  return out;
}
