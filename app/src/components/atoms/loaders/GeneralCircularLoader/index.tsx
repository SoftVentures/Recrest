import { CircularProgress, type CircularProgressProps } from "@mui/material";
import { styled } from "@mui/material/styles";

import { pxToRem } from "@/theme/scale";

/**
 * Indeterminate spinner — drop into a button, inline next to label, or center
 * inside a card to signal "busy, no ETA". Defaults to `SM` (16px) so it sits
 * naturally inside button labels; bump to `MD` (24) for centered loading
 * states or `LG` (40) for full-pane spinners.
 *
 * Adding a size: append the literal to the const + an entry in
 * `CIRCULAR_LOADER_SIZES`.
 */
export const CircularLoaderSize = {
  XS: "xs",
  SM: "sm",
  MD: "md",
  LG: "lg",
} as const;

export type CircularLoaderSize = (typeof CircularLoaderSize)[keyof typeof CircularLoaderSize];

export const CIRCULAR_LOADER_SIZES: Record<CircularLoaderSize, number> = {
  [CircularLoaderSize.XS]: 12,
  [CircularLoaderSize.SM]: 16,
  [CircularLoaderSize.MD]: 24,
  [CircularLoaderSize.LG]: 40,
};

interface RootProps {
  $size: CircularLoaderSize;
}

const Root = styled(CircularProgress, {
  shouldForwardProp: (p) => p !== "$size",
})<RootProps>(({ $size }) => ({
  width: `${pxToRem(CIRCULAR_LOADER_SIZES[$size])} !important`,
  height: `${pxToRem(CIRCULAR_LOADER_SIZES[$size])} !important`,
  flexShrink: 0,
}));

export interface GeneralCircularLoaderProps extends Omit<
  CircularProgressProps,
  "size" | "variant"
> {
  size?: CircularLoaderSize;
  /** Determinate mode requires `value` 0–100. Omit for the default spinner. */
  value?: number;
}

function GeneralCircularLoader({
  size = CircularLoaderSize.SM,
  value,
  ...rest
}: GeneralCircularLoaderProps) {
  return (
    <Root
      $size={size}
      variant={value !== undefined ? "determinate" : "indeterminate"}
      value={value}
      {...rest}
    />
  );
}

export default GeneralCircularLoader;
