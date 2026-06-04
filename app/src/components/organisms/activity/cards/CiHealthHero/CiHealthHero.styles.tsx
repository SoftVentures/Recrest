import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Root = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "12px 14px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  height: "100%",
})) as typeof Box;

export const Label = styled(Box)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
})) as typeof Box;

export const Ring = styled(Box)({
  position: "relative",
  width: 66,
  height: 66,
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
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.2px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
}) as typeof Box;

export const RingSub = styled(Box)(({ theme }) => ({
  fontSize: 9,
  color: theme.palette.text.information,
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
})) as typeof Box;

export const HeadRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
}) as typeof Box;

export const Legend = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 10px",
  marginTop: 2,
}) as typeof Box;

export const LegendItem = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10.5,
  color: theme.palette.text.information,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const LegendDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: color,
}));
