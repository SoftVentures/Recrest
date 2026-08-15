import { Box, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import Logo from "@/components/atoms/brand/Logo";
import { fontPxToRem, pxToRem } from "@/theme/scale";

/**
 * Full-pane "we're booting up" loader — the Recrest logo gently pulses while
 * the renderer wires up Redux/i18n/Tauri. Use this only for app-shell boot or
 * top-level route transitions; inline loading states should reach for
 * `GeneralSkeletonLoader` / `GeneralCircularLoader` / `GeneralLinearLoader`
 * instead so the layout doesn't reflow.
 */
export const LoaderSize = {
  SM: "sm",
  MD: "md",
  LG: "lg",
} as const;

export type LoaderSize = (typeof LoaderSize)[keyof typeof LoaderSize];

export const LOADER_LOGO_PX: Record<LoaderSize, number> = {
  [LoaderSize.SM]: 32,
  [LoaderSize.MD]: 64,
  [LoaderSize.LG]: 96,
};

const breathe = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(0.96); }
  50%       { opacity: 1;    transform: scale(1.04); }
`;

const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(16),
  width: "100%",
  height: "100%",
  minHeight: pxToRem(240),
});

interface MarkProps {
  $size: LoaderSize;
}

const Mark = styled(Box, {
  shouldForwardProp: (p) => p !== "$size",
})<MarkProps>(({ $size }) => ({
  width: pxToRem(LOADER_LOGO_PX[$size]),
  height: pxToRem(LOADER_LOGO_PX[$size]),
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  animation: `${breathe} 1800ms ease-in-out infinite`,
  'html[data-reduced-motion="true"] &': {
    animation: "none",
    opacity: 1,
    transform: "scale(1)",
  },
}));

const Label = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
})) as typeof Typography;

export interface GeneralLoaderProps {
  size?: LoaderSize;
  /** Optional caption shown under the mark (e.g. "Connecting to providers…"). */
  label?: string;
  "data-testid"?: string;
}

function GeneralLoader({ size = LoaderSize.MD, label, "data-testid": testId }: GeneralLoaderProps) {
  return (
    <Root role="status" aria-live="polite" aria-busy data-testid={testId}>
      <Mark $size={size}>
        <Logo />
      </Mark>
      {label && <Label component="span">{label}</Label>}
    </Root>
  );
}

export default GeneralLoader;
