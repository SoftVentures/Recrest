import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem } from "@/theme/scale";

export const TimelineList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(10),
}) as typeof Box;

export const TimelineItem = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
  paddingLeft: pxToRem(12),
  borderLeft: `2px solid ${theme.palette.divider}`,
})) as typeof Box;

export const TimelineHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  fontSize: fontPxToRem(11.5),
}) as typeof Box;

export const TimelineType = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.text.primary,
  fontSize: fontPxToRem(11),
  textTransform: "uppercase",
  letterSpacing: "0.04em",
})) as typeof Typography;

export const TimelineBody = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12.5),
  color: theme.palette.text.primary,
  whiteSpace: "pre-wrap",
})) as typeof Box;

export const Muted = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
})) as typeof Typography;
