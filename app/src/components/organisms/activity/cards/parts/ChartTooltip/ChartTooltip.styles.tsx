import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export const TooltipBox = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12.5,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[6],
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 180,
  maxWidth: 320,
}));

export const TooltipTitle = styled(Box)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.text.primary,
  fontSize: 12,
  marginBottom: 2,
  paddingBottom: 6,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const TooltipRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 18,
});

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed color prop
export const TooltipDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 10,
  height: 10,
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
  paddingLeft: 16,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 700,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
}));
