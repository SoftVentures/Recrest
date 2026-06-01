import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const FieldRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "14px 16px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

export const FieldLeft = styled(Box)({
  flex: "0 0 40%",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
}) as typeof Box;

export const FieldRight = styled(Box)({
  flex: "1 1 auto",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 6,
}) as typeof Box;

export const FieldHeader = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
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

export const FieldMeta = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
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

export const EditRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

export const ValueText = styled(Typography)(({ theme }) => ({
  flex: 1,
  fontSize: 13,
  color: theme.palette.text.primary,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  wordBreak: "break-all",
  minHeight: 18,
})) as typeof Typography;

export const ValueEmpty = styled(Typography)(({ theme }) => ({
  flex: 1,
  fontSize: 13,
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Typography;

export const InlineActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
}) as typeof Box;

export const BooleanRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
}) as typeof Box;

export const SingleLayerHint = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 6,
  background: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 12,
  color: theme.palette.text.information,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  outline: "none",
  "&:focus-visible": {
    borderColor: theme.palette.primary.main,
  },
})) as typeof Box;
