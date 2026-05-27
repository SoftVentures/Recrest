/**
 * Shared "n days ago" helper used across every dev-seed fixture so demo
 * timestamps stay coherent (PR opened 2 days ago, last-commit 1 day ago, etc.).
 *
 * Resolved against `Date.now()` at call time — keeps activity widgets populated
 * regardless of when the dev session was started.
 *
 * Optional `hour`/`minute` override the time-of-day; without them every commit
 * inherits Date.now()'s current hour, which collapses heatmap/clock cards to a
 * single column instead of spreading across the day.
 */
export function daysAgo(n: number, hour?: number, minute?: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  if (hour !== undefined) {
    d.setHours(hour, minute ?? 0, 0, 0);
    // Setting the hour/minute can push the timestamp into the future when
    // n=0 and the chosen hour is later than `now`. Roll back a day so the
    // commit lands in the visible 14-day activity window.
    if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  }
  return d.toISOString();
}
