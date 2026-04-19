import { Skeleton } from "@/components/atoms/Skeleton";

export function MrRowSkeleton() {
  return (
    <div className="a-mr-row" aria-hidden>
      <div className="a-mr-row-icon">
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
      </div>
      <div className="a-mr-row-body">
        <div className="a-mr-row-title">
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="a-mr-row-meta">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="a-mr-row-right">
        <Skeleton className="h-2.5 w-2.5 rounded-full" />
      </div>
    </div>
  );
}
