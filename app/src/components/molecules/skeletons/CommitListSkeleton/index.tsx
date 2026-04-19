import { CommitRowSkeleton } from "@/components/molecules/skeletons/CommitRowSkeleton";

interface CommitListSkeletonProps {
  rows?: number;
}

export function CommitListSkeleton({ rows = 4 }: CommitListSkeletonProps) {
  return (
    <div className="flex flex-col gap-1" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <CommitRowSkeleton key={i} />
      ))}
    </div>
  );
}
