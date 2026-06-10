import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";

const MONO = MONO_STACK;

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

export const RunRow = styled(Box, { shouldForwardProp: (p) => p !== "clickable" })<{
  clickable?: boolean;
}>(({ theme, clickable }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  transition: "background-color 120ms ease, border-color 120ms ease",
  ...(clickable && {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.surface.interface.active,
      borderColor: theme.palette.border.hover,
    },
    // The open-affordance icon stays hidden until the row is hovered/focused —
    // keeps the resting row calm, surfaces the "opens externally" hint on intent.
    "&:hover [data-row-open], &:focus-visible [data-row-open]": { opacity: 1 },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  }),
  'html[data-reduced-motion="true"] &': { transition: "none" },
}));

export const OpenHint = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  color: theme.palette.text.information,
  opacity: 0,
  transition: "opacity 120ms ease",
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
  fontFeatureSettings: CODE_LIGATURES,
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
