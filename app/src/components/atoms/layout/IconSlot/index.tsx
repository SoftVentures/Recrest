import { Box, styled } from "@mui/material";

export interface IconSlotProps {
  size?: number;
  tone?: "default" | "information";
}

const IconSlot = styled(Box, {
  shouldForwardProp: (p) => p !== "size" && p !== "tone",
})<IconSlotProps>(({ size = 14, tone = "default", theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: size,
  height: size,
  ...(tone === "information" ? { color: theme.palette.text.information } : {}),
}));

export default IconSlot;
