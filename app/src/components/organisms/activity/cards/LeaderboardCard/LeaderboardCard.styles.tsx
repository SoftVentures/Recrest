import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { barGradient } from "@/lib/charts/palette";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const List = styled(Box)({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(10),
}) as typeof Box;

export const Row = styled(Box)({
  display: "grid",
  gridTemplateColumns: `${pxToRem(22)} ${pxToRem(22)} 1fr`,
  gap: pxToRem(10),
  alignItems: "center",
}) as typeof Box;

export const Rank = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  textAlign: "right",
})) as typeof Typography;

export const Body = styled(Box)({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
}) as typeof Box;

export const Top = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: pxToRem(8),
  fontSize: fontPxToRem(12),
}) as typeof Box;

export const Name = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

export const Count = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
})) as typeof Typography;

export const Bar = styled(Box)(({ theme }) => ({
  height: pxToRem(5),
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
})) as typeof Box;

export const BarFill = styled(Box, { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    height: "100%",
    width: `${Math.max(4, width)}%`,
    backgroundImage: barGradient(theme.palette.primary.main),
    borderRadius: 8,
    transition: "width 0.2s ease",
  }),
);

export const Spark = styled(Box)({
  display: "flex",
  gap: pxToRem(2),
  height: pxToRem(18),
  alignItems: "flex-end",
  marginTop: pxToRem(2),
  overflow: "hidden",
}) as typeof Box;

export const SparkBar = styled(Box, { shouldForwardProp: (p) => p !== "h" })<{ h: number }>(
  ({ theme, h }) => ({
    flex: 1,
    minWidth: 0,
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 45%, transparent)`,
    borderRadius: 8,
    minHeight: pxToRem(2),
    height: `${Math.max(8, h * 100)}%`,
    opacity: h === 0 ? 0.2 : 1,
  }),
);

export const Empty = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  padding: pxToRems(10, 0),
})) as typeof Box;
