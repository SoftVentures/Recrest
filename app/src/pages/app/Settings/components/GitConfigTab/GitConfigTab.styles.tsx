import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

export const CustomTable = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

export const CustomRow = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(140px, 1fr) minmax(220px, 2.2fr) auto auto",
  alignItems: "center",
  gap: 12,
  padding: "11px 14px",
  minHeight: 60,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

export const CustomCellKey = styled(Typography)(({ theme }) => ({
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  fontWeight: 500,
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
}) as typeof Box;

export const CustomEmpty = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "10px 14px",
  fontStyle: "italic",
})) as typeof Typography;

export const InlineAddForm = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 8,
  border: `1px dashed ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  "& > .MuiFormControl-root": { flex: "1 1 140px", minWidth: 0 },
  "& > .MuiFormControl-root:nth-of-type(2)": { flex: "2 1 220px" },
})) as typeof Box;

export const AddFormActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "flex-end",
  flex: "0 0 auto",
  marginLeft: "auto",
}) as typeof Box;

export const CustomFooter = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: 4,
}) as typeof Box;

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
