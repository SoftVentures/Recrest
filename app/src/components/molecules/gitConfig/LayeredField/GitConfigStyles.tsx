import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const FIELD_ROW_MIN_HEIGHT = 60;
export const FIELD_INPUT_WIDTH = 280;
export const FIELD_LAYER_WIDTH = 180;

export const FieldRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "10px 16px",
  minHeight: FIELD_ROW_MIN_HEIGHT,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  flexWrap: "wrap",
})) as typeof Box;

export const FieldLeft = styled(Box)({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 220px",
  minWidth: 0,
  gap: 2,
}) as typeof Box;

export const FieldRight = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "0 0 auto",
  minWidth: 0,
  justifyContent: "flex-end",
  flexWrap: "wrap",
  marginLeft: "auto",
}) as typeof Box;

export const FieldLabel = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.primary,
  margin: 0,
  lineHeight: 1.3,
})) as typeof Typography;

export const FieldSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  fontWeight: 400,
  color: theme.palette.text.information,
  margin: 0,
  lineHeight: 1.35,
})) as typeof Typography;

export const InputBox = styled(Box)({
  width: FIELD_INPUT_WIDTH,
  maxWidth: "100%",
  flex: "0 0 auto",
}) as typeof Box;

export const LayerSelectBox = styled(Box)({
  width: FIELD_LAYER_WIDTH,
  flex: "0 0 auto",
}) as typeof Box;

export const SwitchBox = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-end",
  width: FIELD_INPUT_WIDTH,
  height: 38,
  flex: "0 0 auto",
}) as typeof Box;

export const LayerChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 6,
  padding: "0 12px",
  height: 38,
  width: FIELD_LAYER_WIDTH,
  borderRadius: 8,
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 12,
  color: theme.palette.text.information,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: "0 0 auto",
})) as typeof Box;

export const LayerChipText = styled(Box)({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Box;

export const SourceBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 999,
  background: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  whiteSpace: "nowrap",
})) as typeof Box;

export const SourceCondition = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Typography;

export const ReadOnlyChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 999,
  background: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Box;

export const ValueText = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  color: theme.palette.text.primary,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  wordBreak: "break-all",
  width: FIELD_INPUT_WIDTH,
  maxWidth: "100%",
  textAlign: "right",
  flex: "0 0 auto",
})) as typeof Typography;
