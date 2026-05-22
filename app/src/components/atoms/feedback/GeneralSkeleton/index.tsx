import { type SkeletonProps as MuiSkeletonProps, Skeleton } from "@mui/material";

export type GeneralSkeletonProps = MuiSkeletonProps;

function GeneralSkeleton(props: GeneralSkeletonProps) {
  return <Skeleton {...props} />;
}

export default GeneralSkeleton;
