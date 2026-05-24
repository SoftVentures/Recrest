import { LinearProgress, type LinearProgressProps } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Horizontal progress bar — used for clone/fetch/install operations where the
 * caller has a useful percentage to show. Omit `value` for an indeterminate
 * shimmer (e.g. "we triggered the operation, no ETA yet").
 *
 * Sits flush at full width by default; constrain via the parent.
 */
export const LinearLoaderThickness = {
  SLIM: "slim",
  REGULAR: "regular",
  THICK: "thick",
} as const;

export type LinearLoaderThickness =
  (typeof LinearLoaderThickness)[keyof typeof LinearLoaderThickness];

export const LINEAR_LOADER_THICKNESS_PX: Record<LinearLoaderThickness, number> = {
  [LinearLoaderThickness.SLIM]: 2,
  [LinearLoaderThickness.REGULAR]: 4,
  [LinearLoaderThickness.THICK]: 6,
};

interface RootProps {
  $thickness: LinearLoaderThickness;
}

const Root = styled(LinearProgress, {
  shouldForwardProp: (p) => p !== "$thickness",
})<RootProps>(({ theme, $thickness }) => ({
  height: LINEAR_LOADER_THICKNESS_PX[$thickness],
  borderRadius: LINEAR_LOADER_THICKNESS_PX[$thickness] / 2,
  backgroundColor: theme.palette.surface.interface.active,
  "& .MuiLinearProgress-bar": {
    borderRadius: LINEAR_LOADER_THICKNESS_PX[$thickness] / 2,
  },
}));

export interface GeneralLinearLoaderProps extends Omit<LinearProgressProps, "variant"> {
  thickness?: LinearLoaderThickness;
  /** Determinate mode requires `value` 0–100. Omit for an indeterminate bar. */
  value?: number;
}

function GeneralLinearLoader({
  thickness = LinearLoaderThickness.REGULAR,
  value,
  ...rest
}: GeneralLinearLoaderProps) {
  return (
    <Root
      $thickness={thickness}
      variant={value !== undefined ? "determinate" : "indeterminate"}
      value={value}
      {...rest}
    />
  );
}

export default GeneralLinearLoader;
