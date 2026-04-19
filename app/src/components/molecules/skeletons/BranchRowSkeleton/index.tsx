import { Skeleton } from "@/components/atoms/Skeleton";

export function BranchRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3" aria-hidden>
      <Skeleton className="h-6 w-6 rounded-md" />
      <Skeleton className="h-3 w-36" />
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-6 w-16 rounded-md" />
    </div>
  );
}
