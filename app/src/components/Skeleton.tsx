import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}

export function RepoRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Skeleton className="h-2 w-2 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-2 w-64" />
      </div>
      <Skeleton className="hidden h-3 w-20 md:block" />
      <Skeleton className="hidden h-3 w-14 md:block" />
    </div>
  );
}
