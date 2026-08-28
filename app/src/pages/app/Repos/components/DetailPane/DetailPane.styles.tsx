import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { opaqueSurfaceBg } from "@/lib/utils/translucency.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

// The width ladder steps down twice so a narrow window hands space back to the
// repo table (whose 800px floor otherwise forces the deliberate horizontal
// scroller in `ListScroll` much earlier than necessary). Flex shrinking is not
// the lever here — both columns want width simultaneously, so there is no slack
// to redistribute; only a narrower pane frees real estate. The steps stay
// container queries rather than media queries because the pane sits beside the
// sidebar, so the viewport width is not what constrains it. Their thresholds are
// in rem so they move with `--ui-scale` — at a larger scale the content needs
// the step sooner, at the same *container* width.
export const Pane = styled(Box)(({ theme }) => ({
  width: pxToRem(360),
  flexShrink: 0,
  borderLeft: `1px solid ${theme.palette.divider}`,
  backgroundColor: opaqueSurfaceBg(theme),
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  [`@container (max-width: ${pxToRem(1180)})`]: {
    width: pxToRem(320),
  },
  [`@container (max-width: ${pxToRem(1040)})`]: {
    width: pxToRem(288),
  },
})) as typeof Box;

export const Header = styled(Box)({
  padding: pxToRems(16, 16, 14),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
}) as typeof Box;

export const HeaderTopRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: pxToRem(10),
}) as typeof Box;

export const HeaderTitleStack = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const RepoName = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(17),
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.3px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const RepoPath = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(3),
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const LangPill = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  marginTop: pxToRem(6),
  fontSize: fontPxToRem(11),
  color: theme.palette.text.secondary,
})) as typeof Typography;

export const LangDot = styled(Typography)(({ theme }) => ({
  width: pxToRem(7),
  height: pxToRem(7),
  borderRadius: "50%",
  backgroundColor: theme.palette.primary.main,
})) as typeof Typography;

export const IconRow = styled(Box)({
  display: "flex",
  gap: pxToRem(5),
  alignItems: "center",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrimaryIde = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(6),
  flex: 1,
  minWidth: 0,
  minHeight: pxToRem(30),
  padding: pxToRems(0, 10),
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12),
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover:not(:disabled)": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
  "&:disabled": {
    opacity: 0.55,
    cursor: "default",
  },
}));

export const BranchCard = styled(Box)(({ theme }) => ({
  margin: pxToRems(0, 16, 14),
  padding: pxToRems(12, 14),
  backgroundColor:
    theme.palette.mode === "dark"
      ? opaqueSurfaceBg(theme)
      : theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(10),
})) as typeof Box;

export const BranchTop = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(10),
}) as typeof Box;

export const BranchQuick = styled(Box)({
  display: "flex",
  gap: pxToRem(5),
}) as typeof Box;

export const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  padding: pxToRems(4, 10),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: fontPxToRem(12.5),
  fontWeight: 500,
  fontFamily: MONO_STACK,
  color: theme.palette.text.primary,
  maxWidth: pxToRem(200),
  minWidth: 0,
})) as typeof Box;

export const BranchText = styled(Box)({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const GhostBtn = styled("button")(({ theme }) => ({
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(5),
  minHeight: pxToRem(26),
  padding: pxToRems(0, 8),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: fontPxToRem(11.5),
  fontWeight: 500,
  cursor: "pointer",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&:disabled": {
    opacity: 0.55,
    cursor: "default",
    backgroundColor: theme.palette.background.paper,
    borderColor: theme.palette.divider,
  },
}));

export const Section = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
})) as typeof Box;

export const SectionHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: pxToRems(12, 16),
  gap: pxToRem(8),
}) as typeof Box;

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.secondary,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SectionAction = styled("button")(({ theme }) => ({
  background: "transparent",
  border: 0,
  fontFamily: "inherit",
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  color: theme.palette.primary.main,
  cursor: "pointer",
  padding: 0,
  "&:hover": { textDecoration: "underline" },
}));

export const Count = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  fontWeight: 500,
  color: theme.palette.text.information,
})) as typeof Typography;

export const SectionBody = styled(Box)({
  padding: pxToRems(0, 16, 14),
}) as typeof Box;

export const SectionEmpty = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.informationLight,
  fontStyle: "italic",
})) as typeof Box;

export const CommitsList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
}) as typeof Box;

export const CommitItem = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: pxToRem(8),
}) as typeof Box;

export const CommitAvatar = styled(Box)(({ theme }) => ({
  width: pxToRem(24),
  height: pxToRem(24),
  borderRadius: "50%",
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  // Chrome glyph in a fixed circle — see the containment policy in theme/scale.
  fontSize: pxToRem(11),
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginTop: pxToRem(1),
})) as typeof Box;

export const CommitText = styled(Box)({ flex: 1, minWidth: 0 }) as typeof Box;

export const CommitSubject = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  fontWeight: 500,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const CommitMeta = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.information,
  marginTop: pxToRem(2),
  display: "flex",
  gap: pxToRem(5),
  alignItems: "center",
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

export const CommitSha = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  color: theme.palette.text.secondary,
})) as typeof Typography;

export const PrList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(6),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrItem = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(8),
  padding: pxToRems(8, 10),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 600,
  color: theme.palette.text.primary,
  cursor: "pointer",
  textAlign: "left",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

export const PrTitle = styled(Box)({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}) as typeof Box;

export const PrMeta = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
})) as typeof Typography;

export const Footer = styled(Box)(({ theme }) => ({
  marginTop: "auto",
  flex: "0 0 auto",
  padding: pxToRems(12, 16, 16),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: opaqueSurfaceBg(theme),
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const FullView = styled("button")(({ theme }) => ({
  width: "100%",
  minHeight: pxToRem(36),
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(8),
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
}));
