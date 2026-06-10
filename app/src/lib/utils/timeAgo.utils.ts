/**
 * Human-readable relative time from an ISO timestamp.
 *
 * Buckets: just now → minutes → hours → days. Returns "—" for invalid input.
 */
export function timeAgo(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  return `${Math.round(diff / 86400)} d ago`;
}
