import { Skeleton } from "@/components/atoms/Skeleton";

export function CommitRowSkeleton() {
  return (
    <div className="flex items-start gap-2 py-1.5" aria-hidden>
      <Skeleton className="h-6 w-6 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-3/4" />
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
    </div>
  );
}
