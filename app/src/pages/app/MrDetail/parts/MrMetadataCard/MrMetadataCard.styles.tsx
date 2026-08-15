import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const MetaGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(${pxToRem(160)}, 1fr))`,
  gap: pxToRem(12),
}) as typeof Box;

export const MetaCell = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(6),
  padding: pxToRems(10, 12),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
})) as typeof Box;

export const MetaLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.informationLight,
})) as typeof Typography;

export const MetaValue = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  fontSize: fontPxToRem(13),
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Box;
