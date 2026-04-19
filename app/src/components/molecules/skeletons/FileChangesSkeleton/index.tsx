import { Skeleton } from "@/components/atoms/Skeleton";

interface FileChangesSkeletonProps {
  rows?: number;
}

export function FileChangesSkeleton({ rows = 4 }: FileChangesSkeletonProps) {
  return (
    <div className="flex flex-col gap-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 border-b border-border/40 py-1 last:border-b-0"
        >
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}
