import { Skeleton } from "@/components/atoms/Skeleton";
import {
  REPO_ROW_COL_TEMPLATE,
  RepoRowSkeleton,
} from "@/components/molecules/skeletons/RepoRowSkeleton";

interface RepoListSkeletonProps {
  rows?: number;
}

export function RepoListSkeleton({ rows = 6 }: RepoListSkeletonProps) {
  return (
    <div className="a-table">
      <div className="a-thead" style={{ gridTemplateColumns: REPO_ROW_COL_TEMPLATE }}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <RepoRowSkeleton key={i} />
      ))}
    </div>
  );
}
