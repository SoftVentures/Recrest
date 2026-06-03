import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export const Head = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
}) as typeof Box;

export const Title = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  flex: 1,
})) as typeof Typography;

export const RunList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

export const RunRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed tone prop on the run-status dot
export const StatusDot = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "passing" | "failing" | "running" | "idle";
}>(({ theme, tone }) => ({
  width: 9,
  height: 9,
  borderRadius: "50%",
  flexShrink: 0,
  backgroundColor:
    tone === "passing"
      ? theme.palette.success.main
      : tone === "failing"
        ? theme.palette.error.main
        : tone === "running"
          ? theme.palette.warning.main
          : theme.palette.text.informationLight,
}));

export const RunMain = styled(Box)({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const RunTitle = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const RunMeta = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: MONO,
})) as typeof Typography;

export const Empty = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "6px 2px",
})) as typeof Typography;

export const FormWrap = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12,
  marginBottom: 10,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
})) as typeof Box;

export const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
}) as typeof Box;

export const Label = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  color: theme.palette.text.information,
})) as typeof Typography;

export const Req = styled(Typography)(({ theme }) => ({
  display: "inline",
  color: theme.palette.error.main,
  marginLeft: 4,
  fontSize: 10,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / IME
export const TextField = styled("input")(({ theme }) => ({
  height: 32,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12.5,
  fontFamily: "inherit",
  outline: "none",
  "&:focus": { borderColor: theme.palette.border.hover },
}));

// eslint-disable-next-line no-restricted-syntax -- native <select> required for the choice-type workflow inputs
export const SelectField = styled("select")(({ theme }) => ({
  height: 32,
  padding: "0 8px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12.5,
  fontFamily: "inherit",
  outline: "none",
}));

export const CheckRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

export const FormActions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
}) as typeof Box;
