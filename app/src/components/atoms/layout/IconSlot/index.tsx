import { Box, styled } from "@mui/material";

import { pxToRem } from "@/theme/scale";

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
  width: pxToRem(size),
  height: pxToRem(size),
  ...(tone === "information" ? { color: theme.palette.text.information } : {}),
}));

export default IconSlot;
