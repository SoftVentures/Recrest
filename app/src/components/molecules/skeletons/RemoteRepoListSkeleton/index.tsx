import { RemoteRepoCardSkeleton } from "@/components/molecules/skeletons/RemoteRepoCardSkeleton";

interface RemoteRepoListSkeletonProps {
  rows?: number;
}

export function RemoteRepoListSkeleton({ rows = 6 }: RemoteRepoListSkeletonProps) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <RemoteRepoCardSkeleton key={i} />
      ))}
    </div>
  );
}
