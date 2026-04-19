import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

/** RepoDetailPage-style KPI card — larger than `KpiTile`, sits in a 4-col
 *  grid at the top of the detail view. */
export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
