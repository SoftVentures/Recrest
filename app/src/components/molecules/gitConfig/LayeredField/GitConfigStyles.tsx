import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const FIELD_ROW_MIN_HEIGHT = 60;
export const FIELD_INPUT_WIDTH = 280;
export const FIELD_LAYER_WIDTH = 180;

export const FieldRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(16),
  padding: pxToRems(10, 16),
  minHeight: pxToRem(FIELD_ROW_MIN_HEIGHT),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  flexWrap: "wrap",
})) as typeof Box;

export const FieldLeft = styled(Box)({
  display: "flex",
  flexDirection: "column",
  flex: `1 1 ${pxToRem(220)}`,
  minWidth: 0,
  gap: pxToRem(2),
}) as typeof Box;

export const FieldRight = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  // Grow into the available row width and allow shrinking below content so the
  // control + layer chip stay inside narrow cards (3-col grid / mobile) instead
  // of overflowing the card edge. `minWidth: 0` is what lets the flex children
  // actually shrink.
  flex: `1 1 ${pxToRem(280)}`,
  minWidth: 0,
  justifyContent: "flex-end",
  flexWrap: "wrap",
  marginLeft: "auto",
}) as typeof Box;

export const FieldLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  fontWeight: 500,
  color: theme.palette.text.primary,
  margin: 0,
  lineHeight: 1.3,
})) as typeof Typography;

export const FieldSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  fontWeight: 400,
  color: theme.palette.text.information,
  margin: 0,
  lineHeight: 1.35,
})) as typeof Typography;

export const InputBox = styled(Box)({
  // Caps at the comfortable desktop width but shrinks on narrow cards.
  flex: `1 1 ${pxToRem(180)}`,
  minWidth: 0,
  maxWidth: pxToRem(FIELD_INPUT_WIDTH),
}) as typeof Box;

export const LayerSelectBox = styled(Box)({
  flex: "0 1 auto",
  minWidth: 0,
  width: pxToRem(FIELD_LAYER_WIDTH),
  maxWidth: pxToRem(FIELD_LAYER_WIDTH),
}) as typeof Box;

export const SwitchBox = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flex: "1 1 auto",
  minWidth: 0,
  maxWidth: pxToRem(FIELD_INPUT_WIDTH),
  height: pxToRem(38),
}) as typeof Box;

export const LayerChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: pxToRem(6),
  padding: pxToRems(0, 12),
  minHeight: pxToRem(38),
  width: pxToRem(FIELD_LAYER_WIDTH),
  borderRadius: 8,
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  // Shrink instead of overflowing the card; the inner text already truncates.
  flex: "0 1 auto",
  minWidth: 0,
})) as typeof Box;

export const LayerChipText = styled(Box)({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Box;

export const SourceBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  padding: pxToRems(2, 8),
  borderRadius: 999,
  background: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
})) as typeof Box;

export const SourceCondition = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Typography;

export const ReadOnlyChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  padding: pxToRems(2, 8),
  borderRadius: 999,
  background: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
})) as typeof Box;

export const ValueText = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  color: theme.palette.text.primary,
  fontFamily: MONO_STACK,
  wordBreak: "break-all",
  flex: "1 1 auto",
  minWidth: 0,
  maxWidth: pxToRem(FIELD_INPUT_WIDTH),
  textAlign: "right",
})) as typeof Typography;
