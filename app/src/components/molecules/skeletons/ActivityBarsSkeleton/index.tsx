import { Skeleton } from "@/components/atoms/Skeleton";

export function ActivityBarsSkeleton() {
  return (
    <div className="a-dash-chart" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="a-dash-bar-col">
          <Skeleton className="a-dash-bar" style={{ height: `${20 + ((i * 37) % 70)}%` }} />
        </div>
      ))}
    </div>
  );
}
