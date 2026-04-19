import { Skeleton } from "@/components/atoms/Skeleton";

export function RemoteRepoCardSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5" aria-hidden>
      <Skeleton className="h-4 w-4 rounded" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <Skeleton className="mt-1 h-2.5 w-3/4" />
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-2 w-16" />
          <Skeleton className="h-2 w-20" />
        </div>
      </div>
    </div>
  );
}
