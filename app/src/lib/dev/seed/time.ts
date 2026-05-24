/**
 * Shared "n days ago" helper used across every dev-seed fixture so demo
 * timestamps stay coherent (PR opened 2 days ago, last-commit 1 day ago, etc.).
 *
 * Resolved against `Date.now()` at call time — keeps activity widgets populated
 * regardless of when the dev session was started.
 */
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
