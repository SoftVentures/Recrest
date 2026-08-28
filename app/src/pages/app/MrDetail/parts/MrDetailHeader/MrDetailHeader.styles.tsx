import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const MONO = MONO_STACK;

export const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: pxToRem(16),
  padding: pxToRem(20),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
})) as typeof Box;

export const PrIcon = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: pxToRem(48),
  height: pxToRem(48),
  borderRadius: 12,
  backgroundColor: theme.palette.success.main,
  color: theme.palette.success.contrastText ?? "#fff",
  flexShrink: 0,
  '&[data-draft="true"]': {
    backgroundColor: theme.palette.surface.interface.backElevation,
    color: theme.palette.text.information,
  },
})) as typeof Box;

export const HeaderBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const TitleRow = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: pxToRem(10),
}) as typeof Box;

export const Title = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(20),
  fontWeight: 700,
  lineHeight: 28 / 20,
  color: theme.palette.text.primary,
  letterSpacing: "-0.02em",
})) as typeof Typography;

export const Subtitle = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(6),
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: pxToRem(8),
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
})) as typeof Box;

export const AuthorRow = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(10),
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  fontSize: fontPxToRem(12.5),
  color: theme.palette.text.information,
})) as typeof Box;

export const AuthorName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  fontSize: fontPxToRem(12.5),
})) as typeof Typography;

export const Sep = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
})) as typeof Typography;

export const MetaRow = styled(Box)({
  marginTop: pxToRem(12),
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: pxToRem(8),
  fontSize: fontPxToRem(11),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed tone prop
export const Chip = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{
  tone: "branch" | "neutral" | "add" | "remove" | "warn" | "ok";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  fontFamily: tone === "branch" ? MONO : "inherit",
  fontFeatureSettings: tone === "branch" ? CODE_LIGATURES : undefined,
  fontSize: tone === "branch" ? fontPxToRem(11.5) : fontPxToRem(11),
  padding: pxToRems(2, 8),
  borderRadius: 8,
  fontWeight: 500,
  color:
    tone === "add"
      ? toneText(theme, StatusTone.SUCCESS)
      : tone === "remove"
        ? toneText(theme, StatusTone.ERROR)
        : tone === "warn"
          ? toneText(theme, StatusTone.WARNING)
          : tone === "ok"
            ? toneText(theme, StatusTone.SUCCESS)
            : theme.palette.text.primary,
  backgroundColor:
    tone === "add" || tone === "ok"
      ? `color-mix(in srgb, ${theme.palette.success.main} 12%, transparent)`
      : tone === "remove"
        ? `color-mix(in srgb, ${theme.palette.error.main} 12%, transparent)`
        : tone === "warn"
          ? `color-mix(in srgb, ${theme.palette.warning.main} 14%, transparent)`
          : theme.palette.surface.interface.backElevation,
}));

export const BranchArrow = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: fontPxToRem(12),
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: clickable branch chip that opens the retarget popover, must stay keyboard-focusable inside the meta row
export const TargetChipBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(11.5),
  padding: pxToRems(2, 8),
  borderRadius: 8,
  fontWeight: 500,
  background: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  border: `1px dashed ${theme.palette.divider}`,
  cursor: "pointer",
  "&:hover": {
    borderColor: theme.palette.border.hover,
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));

export const HeaderActions = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: pxToRem(6),
  flexShrink: 0,
  marginLeft: "auto",
}) as typeof Box;
