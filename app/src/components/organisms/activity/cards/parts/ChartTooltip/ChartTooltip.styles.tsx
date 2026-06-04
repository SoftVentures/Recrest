import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export const TooltipBox = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[4],
  display: "flex",
  flexDirection: "column",
  gap: 3,
}));

export const TooltipTitle = styled(Box)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.secondary,
  fontSize: 11,
  marginBottom: 1,
}));

export const TooltipRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
});

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed color prop
export const TooltipDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: color,
  flexShrink: 0,
}));

export const TooltipLabel = styled(Box)(({ theme }) => ({
  color: theme.palette.text.information,
}));

export const TooltipValue = styled(Box)({
  marginLeft: "auto",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
});
