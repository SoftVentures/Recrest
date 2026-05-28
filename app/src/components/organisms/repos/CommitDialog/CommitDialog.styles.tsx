import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

// eslint-disable-next-line no-restricted-syntax -- native <form> for submit semantics
export const Form = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  paddingTop: theme.spacing(0.5),
}));

export const ContextRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
  paddingBottom: theme.spacing(1),
  marginTop: -theme.spacing(0.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Box;

export const ContextText = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
}) as typeof Box;

export const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 100,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.surface.interface.backElevation,
})) as typeof Box;

export const AuthorLine = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: theme.palette.text.primary,
  fontWeight: 500,
})) as typeof Box;

export const HooksBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 100,
  border: `1px solid ${theme.palette.warning.main}`,
  color: theme.palette.warning.main,
  backgroundColor: `color-mix(in srgb, ${theme.palette.warning.main} 12%, transparent)`,
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  cursor: "help",
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> for keyboard a11y on the disclosure
export const FilesHeader = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  padding: "8px 10px",
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
  textAlign: "left",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

export const FilesHeaderLabel = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const FilesList = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  border: `1px solid ${theme.palette.divider}`,
  borderTop: 0,
  borderBottomLeftRadius: 8,
  borderBottomRightRadius: 8,
  marginTop: -1,
  padding: "6px 10px",
  maxHeight: 160,
  overflowY: "auto",
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11.5,
})) as typeof Box;

export const FileRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "2px 0",
  color: theme.palette.text.primary,
})) as typeof Box;

export const FilePath = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- typed prop variant requires generic element form
export const KindBadge = styled("span", {
  shouldForwardProp: (p) => p !== "kind",
})<{ kind: string }>(({ theme, kind }) => {
  const infoColor = theme.palette.text.information ?? theme.palette.text.secondary;
  const palette: Record<string, { color: string; bg: string }> = {
    added: {
      color: theme.palette.success.dark,
      bg: `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`,
    },
    modified: {
      color: theme.palette.primary.dark,
      bg: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    },
    deleted: {
      color: theme.palette.error.dark,
      bg: `color-mix(in srgb, ${theme.palette.error.main} 14%, transparent)`,
    },
    renamed: { color: infoColor, bg: theme.palette.surface.interface.backElevation },
  };
  const tone = palette[kind] ??
    palette.modified ?? { color: infoColor, bg: theme.palette.surface.interface.backElevation };
  return {
    fontFamily: "inherit",
    fontSize: 9.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "1px 5px",
    borderRadius: 6,
    color: tone.color,
    backgroundColor: tone.bg,
    flexShrink: 0,
    minWidth: 60,
    textAlign: "center",
  };
});

export const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
}) as typeof Box;

export const FieldLabelRow = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <label> required for input association
export const FieldLabel = styled("label")(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
}));

export const SubjectRow = styled(Box)({
  display: "flex",
  alignItems: "stretch",
  gap: 8,
}) as typeof Box;

export const SubjectField = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

// The Template button must visually pair with the subject input — same
// outer height (~40px for small TextField) and same vertical alignment as
// the input row.
export const TemplateSlot = styled(Box)({
  display: "flex",
  alignItems: "stretch",
  "& > button": {
    height: 40,
  },
}) as typeof Box;

export const SubjectCounter = styled(Typography, {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "default" | "warn" | "error" }>(({ theme, tone }) => ({
  fontSize: 10.5,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontVariantNumeric: "tabular-nums",
  color:
    tone === "error"
      ? theme.palette.error.main
      : tone === "warn"
        ? theme.palette.warning.main
        : theme.palette.text.information,
  flexShrink: 0,
}));

export const NoAuthorWarn = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: theme.palette.warning.main,
  fontWeight: 500,
})) as typeof Box;
