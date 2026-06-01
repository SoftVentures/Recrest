import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 20,
}) as typeof Box;

export const SectionCard = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: 16,
  background: theme.palette.background.paper,
  display: "flex",
  flexDirection: "column",
  gap: 12,
})) as typeof Box;

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  margin: 0,
})) as typeof Typography;

export const CustomTable = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  overflow: "hidden",
})) as typeof Box;

export const CustomRow = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(160px, 1fr) minmax(160px, 2fr) auto",
  alignItems: "center",
  gap: 12,
  padding: "8px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  "&:hover .row-actions": { opacity: 1 },
})) as typeof Box;

export const CustomCellKey = styled(Typography)(({ theme }) => ({
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  color: theme.palette.text.primary,
  wordBreak: "break-all",
})) as typeof Typography;

export const CustomCellValue = styled(Typography)(({ theme }) => ({
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  color: theme.palette.text.information,
  wordBreak: "break-all",
})) as typeof Typography;

export const CustomRowActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 4,
  opacity: 0,
  transition: "opacity 120ms ease",
}) as typeof Box;

export const CustomEmpty = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "12px",
  fontStyle: "italic",
})) as typeof Typography;

export const InlineAddForm = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(160px, 1fr) minmax(160px, 2fr) minmax(180px, 1fr) auto",
  alignItems: "center",
  gap: 10,
  padding: 12,
  borderTop: `1px solid ${theme.palette.divider}`,
  background: theme.palette.surface.interface.base,
})) as typeof Box;

export const AddFormActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "flex-end",
}) as typeof Box;

export const CustomFooter = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  padding: 12,
  borderTop: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
})) as typeof Box;

export const InlineErrorText = styled(Typography)(({ theme }) => ({
  gridColumn: "1 / -1",
  fontSize: 11,
  color: theme.palette.error.main,
})) as typeof Typography;

export const LoadingText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Typography;
