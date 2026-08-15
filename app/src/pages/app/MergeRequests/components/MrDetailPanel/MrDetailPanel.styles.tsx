import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Panel = styled(Box)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.surface.interface.base,
  overflow: "hidden",
})) as typeof Box;

export const Header = styled(Box)(({ theme }) => ({
  padding: pxToRem(16),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
  borderBottom: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export const HeaderTopRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: pxToRem(10),
}) as typeof Box;

export const PrIcon = styled(Box)(({ theme }) => ({
  width: pxToRem(28),
  height: pxToRem(28),
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.success.main,
  backgroundColor: `color-mix(in srgb, ${theme.palette.success.main} 15%, transparent)`,
  flexShrink: 0,
  "&[data-draft='true']": {
    color: theme.palette.text.information,
    backgroundColor: theme.palette.surface.interface.backElevation,
  },
})) as typeof Box;

export const HeaderTitleStack = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const Title = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(15),
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
  lineHeight: 1.25,
})) as typeof Box;

export const Subtitle = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  marginTop: pxToRem(4),
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

export const Sep = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
})) as typeof Typography;

export const HeaderCtrls = styled(Box)({
  display: "flex",
  gap: pxToRem(4),
  alignItems: "center",
}) as typeof Box;

export const ActionRow = styled(Box)({
  display: "flex",
  gap: pxToRem(6),
  // Merge + Checkout share the available width like the original mocks.
  "& > button": {
    flex: 1,
    minWidth: 0,
  },
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrimaryAction = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(6),
  padding: pxToRems(8, 12),
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover:not(:disabled)": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
  "&:disabled": { opacity: 0.5, cursor: "default" },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const GhostBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(6),
  padding: pxToRems(7, 12),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 500,
  cursor: "pointer",
  "&:hover:not(:disabled)": {
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&:disabled": { opacity: 0.5, cursor: "default" },
}));

export const InfoStrip = styled(Box)(({ theme }) => ({
  display: "grid",
  // Branch needs the full drawer width — source → target chips at 360 px
  // would otherwise both truncate. Drops to row 2 for Changes + CI.
  gridTemplateColumns: "1fr 1fr",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "& > :first-of-type": {
    gridColumn: "1 / -1",
    borderRight: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
})) as typeof Box;

export const InfoCell = styled(Box)(({ theme }) => ({
  padding: pxToRems(10, 12),
  borderRight: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderRight: 0 },
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
  minWidth: 0,
})) as typeof Box;

export const InfoLabel = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
})) as typeof Box;

export const InfoValue = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(4),
  fontSize: fontPxToRem(12),
  minWidth: 0,
  flexWrap: "nowrap",
  overflow: "hidden",
}) as typeof Box;

export const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  padding: pxToRems(2, 6),
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.primary,
  // The source branch shrinks + truncates so a very long ref (e.g. a dependabot
  // branch) can't push the arrow + target out of the cell.
  flex: "0 1 auto",
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
})) as typeof Box;

// The target branch (usually "main"/"develop") keeps its full width so source →
// target stays fully readable however long the source ref gets.
export const BranchChipFixed = styled(BranchChip)({
  flex: "0 0 auto",
}) as typeof Box;

export const BranchGlyph = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  color: theme.palette.text.information,
  flexShrink: 0,
})) as typeof Typography;

export const BranchName = styled(Typography)({
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: MONO_STACK,
  fontSize: fontPxToRem(10.5),
}) as typeof Typography;

export const Arrow = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: fontPxToRem(11),
  flexShrink: 0,
})) as typeof Typography;

export const Diff = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  gap: pxToRem(4),
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
})) as typeof Box;

export const Muted = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: fontPxToRem(11),
})) as typeof Typography;

export const CiPill = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(5),
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.primary,
  fontWeight: 500,
  textTransform: "capitalize",
})) as typeof Typography;

export const CiDot = styled(Box)(({ theme }) => ({
  width: pxToRem(7),
  height: pxToRem(7),
  borderRadius: "50%",
  backgroundColor: theme.palette.text.informationLight,
  "&[data-state='passing']": { backgroundColor: theme.palette.success.main },
  "&[data-state='failing']": { backgroundColor: theme.palette.error.main },
  "&[data-state='running']": { backgroundColor: theme.palette.warning.main },
})) as typeof Box;

export const Body = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
}) as typeof Box;

export const SectionBox = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SectionHead = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  width: "100%",
  padding: pxToRems(10, 16),
  border: 0,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  color: theme.palette.text.primary,
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

export const SectionTitle = styled(Typography)({
  fontSize: fontPxToRem(10.5),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  flex: 1,
}) as typeof Typography;

export const SectionCount = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

export const SectionBody = styled(Box)({
  padding: pxToRems(0, 16, 12),
}) as typeof Box;

// Caps a long PR description so it scrolls inside the section instead of
// stretching the whole pane; MarkdownView supplies its own typography.
export const DescriptionBox = styled(Box)({
  maxHeight: pxToRem(240),
  overflow: "auto",
  fontSize: fontPxToRem(12.5),
}) as typeof Box;

export const Empty = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.informationLight,
  fontStyle: "italic",
  padding: pxToRems(4, 0),
})) as typeof Box;

export const ReviewerChips = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: pxToRem(6),
}) as typeof Box;

export const ReviewerChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(5),
  padding: pxToRems(3, 8),
  borderRadius: 100,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.primary,
  "&[data-state='approved']": {
    borderColor: `color-mix(in srgb, ${theme.palette.success.main} 40%, transparent)`,
    color: theme.palette.success.main,
  },
  "&[data-state='changes_requested']": {
    borderColor: `color-mix(in srgb, ${theme.palette.error.main} 40%, transparent)`,
    color: theme.palette.error.main,
  },
})) as typeof Box;

export const ReviewerState = styled(Typography)({
  fontSize: fontPxToRem(10),
  textTransform: "capitalize",
  opacity: 0.75,
}) as typeof Typography;

export const FilesList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: pxToRem(240),
  overflow: "auto",
}) as typeof Box;

export const FileItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(8),
  padding: pxToRems(4, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  fontSize: fontPxToRem(11.5),
  fontFamily: MONO_STACK,
})) as typeof Box;

export const FilePath = styled(Typography)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: theme.palette.text.primary,
})) as typeof Typography;

export const FileDiff = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  gap: pxToRem(5),
  fontSize: fontPxToRem(10.5),
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
})) as typeof Box;

export const TimelineList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: pxToRem(240),
  overflow: "auto",
}) as typeof Box;

export const TimelineItem = styled(Box)(({ theme }) => ({
  padding: pxToRems(6, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-of-type": { borderBottom: 0 },
  fontSize: fontPxToRem(11.5),
})) as typeof Box;

export const TimelineHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(5),
  flexWrap: "wrap",
}) as typeof Box;

export const TimelineType = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  textTransform: "capitalize",
  color: theme.palette.text.primary,
})) as typeof Typography;

export const TimelineBody = styled(Box)(({ theme }) => ({
  marginTop: pxToRem(2),
  color: theme.palette.text.information,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
})) as typeof Box;

export const Meta = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
  fontSize: fontPxToRem(12),
  color: theme.palette.text.primary,
})) as typeof Box;

export const MetaRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(10),
}) as typeof Box;

export const MetaKey = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  flexShrink: 0,
})) as typeof Box;

export const MetaVal = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  minWidth: 0,
  overflow: "hidden",
  fontSize: fontPxToRem(12),
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.primary,
  "& > span": {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
})) as typeof Box;

export const Footer = styled(Box)(({ theme }) => ({
  padding: pxToRem(12),
  borderTop: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const FullCta = styled("button")(({ theme }) => ({
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(6),
  padding: pxToRems(9, 12),
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
}));
