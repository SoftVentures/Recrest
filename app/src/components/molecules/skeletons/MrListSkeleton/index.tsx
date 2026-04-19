import { MrRowSkeleton } from "@/components/molecules/skeletons/MrRowSkeleton";

interface MrListSkeletonProps {
  rows?: number;
}

export function MrListSkeleton({ rows = 5 }: MrListSkeletonProps) {
  return (
    <div className="a-mr-rows scroll" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <MrRowSkeleton key={i} />
      ))}
    </div>
  );
}
