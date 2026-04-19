import { Skeleton } from "@/components/atoms/Skeleton";
import { SearchHitSkeleton } from "@/components/molecules/skeletons/SearchHitSkeleton";

interface SearchGroupSkeletonProps {
  rows?: number;
}

export function SearchGroupSkeleton({ rows = 3 }: SearchGroupSkeletonProps) {
  return (
    <div className="border-b border-border last:border-b-0" aria-hidden>
      <div className="bg-muted/50 px-3 py-1.5">
        <Skeleton className="h-3 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SearchHitSkeleton key={i} />
      ))}
    </div>
  );
}
