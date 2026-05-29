import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 16,
}) as typeof Box;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
})) as typeof Typography;

export const StrategyList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 8,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <label> required so clicking anywhere on the card toggles the wrapped MUI <Radio>
export const StrategyOption = styled("label", {
  shouldForwardProp: (p) => p !== "selected",
})<{ selected: boolean }>(({ theme, selected }) => ({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 10,
  alignItems: "flex-start",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected
    ? `color-mix(in srgb, ${theme.palette.primary.main} 6%, transparent)`
    : theme.palette.background.paper,
  cursor: "pointer",
  transition: "border-color 120ms ease, background-color 120ms ease",
  "&:hover": {
    borderColor: theme.palette.border.hover,
  },
}));

export const StrategyText = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 2,
}) as typeof Box;

export const StrategyName = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const StrategyDesc = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  lineHeight: 1.45,
})) as typeof Typography;

export const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <input> required for accessibility / autofocus
export const TitleInput = styled("input")(({ theme }) => ({
  width: "100%",
  height: 36,
  padding: "0 12px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontFamily: MONO,
  fontSize: 13,
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
    minHeight: 96,
    maxHeight: 180,
    overflowY: "auto",
  },
}) as typeof Box;

export const DeleteBranchLabel = styled(Box)(({ theme }) => ({
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Box;

export const DeleteBranchHint = styled(Box)(({ theme }) => ({
  display: "block",
  fontSize: 11.5,
  color: theme.palette.text.information,
  marginTop: 2,
})) as typeof Box;

export const ProviderNote = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
  padding: "8px 10px",
  borderRadius: 6,
  backgroundColor: theme.palette.surface.interface.backElevation,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button> matching the RepoDetail PrimaryBtn visual (filled neutral)
export const PrimaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.text.primary}`,
  background: theme.palette.text.primary,
  color: theme.palette.background.paper,
  fontFamily: "inherit",
  fontSize: 12.5,
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
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));
