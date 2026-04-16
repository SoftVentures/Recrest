export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = now.getTime() - then;
  const absSeconds = Math.floor(Math.abs(diff) / 1000);

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  const pick = (value: number, unit: string): string =>
    `${value} ${unit}${value === 1 ? "" : "s"} ${diff >= 0 ? "ago" : "from now"}`;

  if (absSeconds < minute) return "just now";
  if (absSeconds < hour) return pick(Math.floor(absSeconds / minute), "minute");
  if (absSeconds < day) return pick(Math.floor(absSeconds / hour), "hour");
  if (absSeconds < week) return pick(Math.floor(absSeconds / day), "day");
  if (absSeconds < month) return pick(Math.floor(absSeconds / week), "week");
  if (absSeconds < year) return pick(Math.floor(absSeconds / month), "month");
  return pick(Math.floor(absSeconds / year), "year");
}

export function truncatePath(path: string, maxLength = 48): string {
  if (path.length <= maxLength) return path;
  const parts = path.split(/[\\/]/);
  if (parts.length <= 2) return path;
  const head = parts[0] ?? "";
  const tail = parts.slice(-2).join("/");
  const result = `${head}/…/${tail}`;
  return result.length <= maxLength ? result : `…/${tail}`;
}

export function formatBranchName(branch: string | null | undefined, fallback = "—"): string {
  if (!branch) return fallback;
  return branch.startsWith("refs/heads/") ? branch.slice("refs/heads/".length) : branch;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
