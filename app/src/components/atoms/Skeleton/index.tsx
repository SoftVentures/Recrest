import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  /** Inline style is handy when the parent lays out with
   *  `gridTemplateColumns` inline — we need to sit in that grid and
   *  still animate. */
  style?: CSSProperties;
}

/** Base shimmer placeholder. Sized and positioned by the caller. Use the
 *  variants in `molecules/skeletons/*` for composed row shapes. */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} style={style} aria-hidden />
  );
}
