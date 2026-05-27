import { Skeleton, type SkeletonProps } from "@mui/material";

/**
 * Inline content placeholder for the milliseconds-to-seconds gap between
 * "we're loading" and "data ready". Use one of `LINE` / `BLOCK` / `CIRCLE`
 * via the `shape` prop — the variant maps to MUI's `Skeleton variant`,
 * `width`/`height` default per shape but can be overridden.
 *
 * Picks the right primitive automatically: the LINE shape draws a 1em-tall
 * pill so it sits on the typography baseline; BLOCK draws a rectangular
 * surface; CIRCLE draws an avatar-sized round placeholder.
 */
export const SkeletonShape = {
  LINE: "line",
  BLOCK: "block",
  CIRCLE: "circle",
} as const;

export type SkeletonShape = (typeof SkeletonShape)[keyof typeof SkeletonShape];

const SHAPE_TO_VARIANT: Record<SkeletonShape, NonNullable<SkeletonProps["variant"]>> = {
  [SkeletonShape.LINE]: "text",
  [SkeletonShape.BLOCK]: "rectangular",
  [SkeletonShape.CIRCLE]: "circular",
};

export interface GeneralSkeletonLoaderProps extends Omit<SkeletonProps, "variant" | "animation"> {
  shape?: SkeletonShape;
  /** Disable the shimmer (e.g. `prefers-reduced-motion`). Defaults to `wave`. */
  animation?: "wave" | "pulse" | false;
}

function GeneralSkeletonLoader({
  shape = SkeletonShape.LINE,
  animation = "wave",
  ...rest
}: GeneralSkeletonLoaderProps) {
  return <Skeleton variant={SHAPE_TO_VARIANT[shape]} animation={animation} {...rest} />;
}

export default GeneralSkeletonLoader;
