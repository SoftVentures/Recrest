import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Chart = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  gap: 4,
  height: 180,
});

export const Column = styled(Box)({
  flex: 1,
  display: "flex",
  alignItems: "flex-end",
  height: "100%",
  minWidth: 0,
});

export const Stack = styled(Box)({
  width: "100%",
  display: "flex",
  flexDirection: "column-reverse",
  borderRadius: "8px 8px 0 0",
  overflow: "hidden",
  minHeight: 0,
  transition: "filter 0.12s ease",
  "&:hover": {
    filter: "brightness(1.06) saturate(1.1)",
  },
});

export const Seg = styled(Box, { shouldForwardProp: (p) => p !== "color" && p !== "flexValue" })<{
  color: string;
  flexValue: number;
}>(({ color, flexValue }) => ({
  width: "100%",
  flex: flexValue,
  minHeight: 2,
  backgroundColor: color,
}));

export const EmptyCol = styled(Box)(({ theme }) => ({
  width: "100%",
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px dashed ${theme.palette.divider}`,
  borderBottom: 0,
  borderRadius: "8px 8px 0 0",
  opacity: 0.5,
}));

export const Axis = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 4,
}));

export const TooltipBody = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 2,
  minWidth: 140,
});

export const TooltipTitle = styled(Box)({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "-0.1px",
});

export const TooltipRow = styled(Box)({
  display: "grid",
  gridTemplateColumns: "10px 1fr auto",
  alignItems: "center",
  gap: 6,
  fontSize: 10.5,
});

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const TooltipDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: color,
}));
