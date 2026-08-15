import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";
import { opaqueSurfaceBg } from "@/lib/utils/translucency.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const MONO = MONO_STACK;

export const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(16),
}) as typeof Box;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
})) as typeof Typography;

export const StrategyList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
  marginTop: pxToRem(8),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <label> required so clicking anywhere on the card toggles the wrapped MUI <Radio>
export const StrategyOption = styled("label", {
  shouldForwardProp: (p) => p !== "selected" && p !== "disabled",
})<{ selected: boolean; disabled?: boolean }>(({ theme, selected, disabled }) => ({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: pxToRem(10),
  alignItems: "flex-start",
  padding: pxToRems(10, 12),
  borderRadius: 8,
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected
    ? `color-mix(in srgb, ${theme.palette.primary.main} 6%, transparent)`
    : theme.palette.background.paper,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
  transition: "border-color 120ms ease, background-color 120ms ease",
  "&:hover": {
    borderColor: disabled ? theme.palette.divider : theme.palette.border.hover,
  },
}));

export const StrategyDisabledHint = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  marginTop: pxToRem(4),
  fontStyle: "italic",
})) as typeof Typography;

export const StrategyText = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
}) as typeof Box;

export const StrategyName = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const StrategyDesc = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  lineHeight: 1.45,
})) as typeof Typography;

export const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(6),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <input> required for accessibility / autofocus
export const TitleInput = styled("input")(({ theme }) => ({
  width: "100%",
  minHeight: pxToRem(36),
  padding: pxToRems(0, 12),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: opaqueSurfaceBg(theme),
  color: theme.palette.text.primary,
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(13),
  outline: "none",
  "&:focus": { borderColor: theme.palette.border.hover },
}));

// The description now uses the shared `<RichTextEditor>` molecule (TipTap).
// Cap the editor body so a long PR description (Dependabot, long release
// notes) scrolls inside the editor instead of pushing Title + Strategy +
// Actions off the bottom of small viewports. Behaviour matches the previous
// textarea: ~96px floor, ~180px ceiling, internal scroll once content
// exceeds it.
export const DescriptionWrap = styled(Box)({
  "& .ProseMirror": {
    minHeight: pxToRem(96),
    maxHeight: pxToRem(180),
    overflowY: "auto",
  },
}) as typeof Box;

export const DeleteBranchLabel = styled(Box)(({ theme }) => ({
  display: "block",
  fontSize: fontPxToRem(13),
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Box;

export const DeleteBranchHint = styled(Box)(({ theme }) => ({
  display: "block",
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  marginTop: pxToRem(2),
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> matching the RepoDetail PrimaryBtn visual (filled neutral)
export const PrimaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  minHeight: pxToRem(32),
  padding: pxToRems(0, 14),
  borderRadius: 8,
  border: `1px solid ${theme.palette.text.primary}`,
  background: theme.palette.text.primary,
  color: theme.palette.background.paper,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 600,
  cursor: "pointer",
  "&:hover": { opacity: 0.92 },
  "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> matching the RepoDetail SecondaryBtn visual (outline neutral)
export const SecondaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  minHeight: pxToRem(32),
  padding: pxToRems(0, 12),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12),
  fontWeight: 500,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));
