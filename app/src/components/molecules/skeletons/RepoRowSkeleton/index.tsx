import { Skeleton } from "@/components/atoms/Skeleton";

/** Column template kept in sync with the real `RepoRow` grid so the
 *  skeleton occupies the same space and the layout doesn't jump when the
 *  real rows paint in. */
export const REPO_ROW_COL_TEMPLATE = "minmax(220px, 1.6fr) minmax(130px, 0.8fr) 110px 96px 120px";

export function RepoRowSkeleton() {
  return (
    <div
      className="a-row d-comfy"
      style={{ gridTemplateColumns: REPO_ROW_COL_TEMPLATE }}
      aria-hidden
    >
      <div className="a-c-name">
        <Skeleton className="h-7 w-7 rounded-md" />
        <div className="a-name-stack">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-1 h-2 w-56" />
        </div>
      </div>
      <div className="a-c-branch">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="mt-1 h-3 w-12" />
      </div>
      <div className="a-c-status">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-1 h-2 w-12" />
      </div>
      <div className="a-c-activity">
        <Skeleton className="h-4 w-[88px]" />
      </div>
      <div className="a-c-actions">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-7 rounded-md" />
        ))}
      </div>
    </div>
  );
}
