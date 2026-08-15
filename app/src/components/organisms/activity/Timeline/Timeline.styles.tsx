import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { StatusTone, toneChip } from "@/lib/utils/toneColor.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const PillCount = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: pxToRem(16),
  minHeight: pxToRem(14),
  padding: pxToRems(0, 4),
  borderRadius: 999,
  fontSize: fontPxToRem(9.5),
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.information,
  ".Mui-selected &": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
})) as typeof Box;

export const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
}) as typeof Box;

export const DayCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: pxToRems(10, 12),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
})) as typeof Box;

export const DayHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(10),
  flexWrap: "wrap",
}) as typeof Box;

export const DayTitle = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.primary,
})) as typeof Box;

export const ChipRow = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  flexWrap: "wrap",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const Chip = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "neutral" | "ok" | "info" | "err";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: fontPxToRem(10),
  fontWeight: 600,
  padding: pxToRems(2, 7),
  borderRadius: 100,
  ...(tone === "ok" && toneChip(theme, StatusTone.SUCCESS)),
  ...(tone === "info" && toneChip(theme, StatusTone.PRIMARY)),
  ...(tone === "err" && toneChip(theme, StatusTone.ERROR)),
  ...(tone === "neutral" && {
    backgroundColor: theme.palette.surface.interface.base,
    color: theme.palette.text.secondary,
  }),
}));

export const Feed = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
})) as typeof Box;

export const Empty = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  padding: pxToRems(16, 0),
  textAlign: "center",
})) as typeof Box;

export const ShowMore = styled(Box)({
  display: "flex",
  justifyContent: "center",
  paddingTop: pxToRem(4),
}) as typeof Box;
