import { Skeleton } from "@/components/atoms/Skeleton";

export function ReviewerChipsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-24 rounded-full" />
      ))}
    </div>
  );
}
