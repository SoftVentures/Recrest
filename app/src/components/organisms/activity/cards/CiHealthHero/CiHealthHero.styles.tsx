import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Root = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: pxToRems(12, 14, 10),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(6),
  height: "100%",
})) as typeof Box;

export const Label = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
})) as typeof Box;

export const Ring = styled(Box)({
  position: "relative",
  width: pxToRem(66),
  height: pxToRem(66),
  flexShrink: 0,
}) as typeof Box;

export const RingLabel = styled(Box)({
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  lineHeight: 1,
  pointerEvents: "none",
}) as typeof Box;

export const RingValue = styled(Box)({
  fontSize: fontPxToRem(15),
  fontWeight: 700,
  letterSpacing: "-0.2px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
}) as typeof Box;

export const HeadRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(12),
}) as typeof Box;

export const Legend = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: pxToRems(4, 10),
  marginTop: pxToRem(2),
}) as typeof Box;

export const LegendItem = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.information,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const LegendDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: pxToRem(6),
  height: pxToRem(6),
  borderRadius: "50%",
  backgroundColor: color,
}));
