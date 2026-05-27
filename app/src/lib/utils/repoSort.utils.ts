import type { EnrichedRepo } from "@/lib/repoEnrich";

/**
 * Numeric rank for sorting repos by their working-tree state.
 * Lower wins (conflicts surface first, clean repos sink to the bottom).
 */
export function statusRank(repo: EnrichedRepo): number {
  if (repo.status.conflicted > 0) return 0;
  if (repo.status.dirty) return 1;
  if (repo.status.behind > 0) return 2;
  if (repo.status.ahead > 0) return 3;
  return 4;
}

/** Epoch ms of the repo's last commit, or 0 when no timestamp is available. */
export function lastCommitTime(repo: EnrichedRepo): number {
  const ts = repo.status.lastCommit?.timestamp;
  if (!ts) return 0;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}
