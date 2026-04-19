import { Skeleton } from "@/components/atoms/Skeleton";

export function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3" aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-6 w-16" />
      <Skeleton className="mt-2 h-2.5 w-20" />
    </div>
  );
}
