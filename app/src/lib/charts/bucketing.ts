/**
 * Day-bucket size that keeps time-series charts at a renderable number of
 * x-categories. Rendering one bar/point per day freezes Nivo once a window
 * spans a year or more (365+ categories, thousands for "all"), so we widen the
 * bucket as the window grows: daily up to 90d, weekly up to ~14 months,
 * monthly beyond.
 */
export function bucketSizeForWindow(windowDays: number): number {
  if (windowDays <= 90) return 1;
  if (windowDays <= 430) return 7;
  return 30;
}

export interface DayBucket<T> {
  /** Bucket index, 0 = newest. */
  bucket: number;
  /** Newest (smallest) days-ago index contained in this bucket — used for the
   *  date label. */
  newestDay: number;
  rows: T[];
}

/**
 * Groups newest-first day-indexed rows into buckets of `size` days. Bucket 0
 * contains days `[0, size)`, bucket 1 `[size, 2*size)`, and so on. Each bucket
 * keeps its newest day index for date labelling. Rows are assigned by their
 * own `getDay` value, so gaps or unsorted input still land in the right
 * bucket; the returned buckets are ordered newest-first.
 */
export function bucketDays<T>(
  rows: readonly T[],
  getDay: (row: T) => number,
  size: number,
): Array<DayBucket<T>> {
  const step = Math.max(1, Math.floor(size));
  const byBucket = new Map<number, T[]>();
  for (const row of rows) {
    const day = getDay(row);
    if (day < 0) continue;
    const bucket = Math.floor(day / step);
    const list = byBucket.get(bucket);
    if (list) list.push(row);
    else byBucket.set(bucket, [row]);
  }
  return Array.from(byBucket.keys())
    .sort((a, b) => a - b)
    .map((bucket) => ({
      bucket,
      newestDay: bucket * step,
      rows: byBucket.get(bucket)!,
    }));
}

/** Local-date label for a days-ago offset, e.g. "12 Mar" / "12. März". */
export function dayLabel(daysAgo: number, locale: string, now?: Date): string {
  const d = new Date((now ?? new Date()).getTime() - daysAgo * 86_400_000);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}
