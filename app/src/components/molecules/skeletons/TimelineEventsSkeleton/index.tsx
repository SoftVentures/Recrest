import { Skeleton } from "@/components/atoms/Skeleton";

interface TimelineEventsSkeletonProps {
  rows?: number;
}

export function TimelineEventsSkeleton({ rows = 4 }: TimelineEventsSkeletonProps) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border/40 py-1.5 last:border-b-0">
          <div className="flex gap-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="mt-1 h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}
