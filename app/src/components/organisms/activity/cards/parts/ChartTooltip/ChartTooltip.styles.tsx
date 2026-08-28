import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const TooltipBox = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 10,
  padding: pxToRems(10, 14),
  fontSize: fontPxToRem(12.5),
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[6],
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(6),
  minWidth: pxToRem(180),
  maxWidth: pxToRem(320),
}));

export const TooltipTitle = styled(Box)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.text.primary,
  fontSize: fontPxToRem(12),
  marginBottom: pxToRem(2),
  paddingBottom: pxToRem(6),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const TooltipRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  minHeight: pxToRem(18),
});

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed color prop
export const TooltipDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: pxToRem(10),
  height: pxToRem(10),
  borderRadius: 3,
  backgroundColor: color,
  flexShrink: 0,
}));

export const TooltipLabel = styled(Box)(({ theme }) => ({
  color: theme.palette.text.secondary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

export const TooltipValue = styled(Box)(({ theme }) => ({
  marginLeft: "auto",
  paddingLeft: pxToRem(16),
  fontVariantNumeric: "tabular-nums",
  fontWeight: 700,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
}));
