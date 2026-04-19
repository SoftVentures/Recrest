import { Skeleton } from "@/components/atoms/Skeleton";

interface CardBlockSkeletonProps {
  rows?: number;
  title?: boolean;
}

export function CardBlockSkeleton({ rows = 3, title = true }: CardBlockSkeletonProps) {
  return (
    <div className="a-dash-card" aria-hidden>
      {title && (
        <div className="a-dash-card-h">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      )}
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
