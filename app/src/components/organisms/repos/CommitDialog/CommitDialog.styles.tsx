import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

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
  gap: pxToRem(8),
  flexWrap: "wrap",
  paddingBottom: theme.spacing(1),
  marginTop: theme.spacing(-0.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
})) as typeof Box;

export const ContextText = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  flexWrap: "wrap",
}) as typeof Box;

export const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  padding: pxToRems(2, 8),
  borderRadius: 100,
  fontFamily: MONO_STACK,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.surface.interface.backElevation,
})) as typeof Box;

export const AuthorLine = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  color: theme.palette.text.primary,
  fontWeight: 500,
})) as typeof Box;

export const HooksBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  padding: pxToRems(2, 8),
  borderRadius: 100,
  border: `1px solid ${theme.palette.warning.main}`,
  color: toneText(theme, StatusTone.WARNING),
  backgroundColor: `color-mix(in srgb, ${theme.palette.warning.main} 12%, transparent)`,
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  cursor: "help",
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> for keyboard a11y on the disclosure
export const FilesHeader = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  width: "100%",
  padding: pxToRems(8, 10),
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: fontPxToRem(12),
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
  gap: pxToRem(2),
  border: `1px solid ${theme.palette.divider}`,
  borderTop: 0,
  borderBottomLeftRadius: 8,
  borderBottomRightRadius: 8,
  // -1 px, not rem: it cancels the header's 1 px bottom border, which stays a
  // hairline at every scale.
  marginTop: -1,
  padding: pxToRems(6, 10),
  maxHeight: pxToRem(160),
  overflowY: "auto",
  fontFamily: MONO_STACK,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(11.5),
})) as typeof Box;

export const FileRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  padding: pxToRems(2, 0),
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
      color: toneText(theme, StatusTone.SUCCESS),
      bg: `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`,
    },
    modified: {
      color: toneText(theme, StatusTone.PRIMARY),
      bg: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    },
    deleted: {
      color: toneText(theme, StatusTone.ERROR),
      bg: `color-mix(in srgb, ${theme.palette.error.main} 14%, transparent)`,
    },
    renamed: { color: infoColor, bg: theme.palette.surface.interface.backElevation },
  };
  const tone = palette[kind] ??
    palette.modified ?? { color: infoColor, bg: theme.palette.surface.interface.backElevation };
  return {
    fontFamily: "inherit",
    fontSize: fontPxToRem(9.5),
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: pxToRems(1, 5),
    borderRadius: 6,
    color: tone.color,
    backgroundColor: tone.bg,
    flexShrink: 0,
    minWidth: pxToRem(60),
    textAlign: "center",
  };
});

export const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
}) as typeof Box;

export const FieldLabelRow = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: pxToRem(8),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <label> required for input association
export const FieldLabel = styled("label")(({ theme }) => ({
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
}));

export const SubjectRow = styled(Box)({
  display: "flex",
  alignItems: "stretch",
  gap: pxToRem(8),
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
    height: pxToRem(40),
  },
}) as typeof Box;

export const SubjectCounter = styled(Typography, {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "default" | "warn" | "error" }>(({ theme, tone }) => ({
  fontSize: fontPxToRem(10.5),
  fontFamily: MONO_STACK,
  fontFeatureSettings: CODE_LIGATURES,
  fontVariantNumeric: "tabular-nums",
  color:
    tone === "error"
      ? toneText(theme, StatusTone.ERROR)
      : tone === "warn"
        ? toneText(theme, StatusTone.WARNING)
        : theme.palette.text.information,
  flexShrink: 0,
}));

export const NoAuthorWarn = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  color: toneText(theme, StatusTone.WARNING),
  fontWeight: 500,
})) as typeof Box;
