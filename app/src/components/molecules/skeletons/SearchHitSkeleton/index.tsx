import { Skeleton } from "@/components/atoms/Skeleton";

export function SearchHitSkeleton() {
  return (
    <div className="border-t border-border/50 px-3 py-2" aria-hidden>
      <Skeleton className="h-2.5 w-48" />
      <Skeleton className="mt-1 h-3 w-full" />
    </div>
  );
}
