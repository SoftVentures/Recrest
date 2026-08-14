/**
 * Time-window guard for work that several independent triggers can request.
 *
 * Repo rescans and store reloads are both driven by sources we don't control
 * (filesystem watcher bursts, window focus, a timer). Each trigger asks this
 * helper whether enough time has passed since the last run instead of owning
 * its own timer, so all of them share one budget.
 *
 * `lastRunAt === null` means "never ran" and always passes. `now` is injectable
 * so the rule stays testable without fake timers.
 */
export function isThrottleElapsed(
  lastRunAt: number | null,
  minIntervalMs: number,
  now: number = Date.now(),
): boolean {
  if (lastRunAt === null) return true;
  return now - lastRunAt >= minIntervalMs;
}
