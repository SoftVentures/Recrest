import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { motion } from "motion/react";

import { MONO_STACK } from "@/lib/utils/appearance.utils";

export const Root = styled(Box)({
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  // Reserve scrollbar gutter so width is identical whether the page
  // currently overflows or not — keeps page-swap horizontally stable.
  scrollbarGutter: "stable",
}) as typeof Box;

export const BackBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "12px 24px 0",
  color: theme.palette.text.information,
  fontSize: 12,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const BackButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: 0,
  padding: 4,
  color: "inherit",
  fontFamily: "inherit",
  fontSize: 12,
  cursor: "pointer",
  borderRadius: 8,
  "&:hover": { color: theme.palette.text.primary },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

export const Content = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  // Intentionally no `flex: 1` here: the Root above is the scroll surface
  // and we want Content's height to be driven by its children + padding.
  // With `flex: 1`, Content gets clamped to Root's viewport height and
  // tall children visually escape its box — leaving paddingBottom above
  // the last visible card instead of below it.
})) as typeof Box;

export const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: 16,
  padding: 20,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
})) as typeof Box;

export const HeaderBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const TitleRow = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
}) as typeof Box;

export const RepoName = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  fontWeight: 700,
  lineHeight: "30px",
  color: theme.palette.text.primary,
  letterSpacing: "-0.02em",
})) as typeof Typography;

export const LangPill = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 100,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  fontWeight: 500,
  color: theme.palette.primary.main,
})) as typeof Box;

export const LangDot = styled(Box)(({ theme }) => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: theme.palette.primary.main,
})) as typeof Box;

export const PathText = styled(Typography)(({ theme }) => ({
  marginTop: 4,
  fontFamily: MONO_STACK,
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

export const MetaRow = styled(Box)({
  marginTop: 10,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const Chip = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "branch" | "clean" | "dirty" | "ahead" | "behind" | "remote" }>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: tone === "branch" ? MONO_STACK : "inherit",
  fontSize: tone === "branch" ? 11.5 : 11,
  padding: "2px 8px",
  borderRadius: 8,
  fontWeight: 500,
  textTransform: "none",
  letterSpacing: "normal",
  color:
    tone === "clean"
      ? theme.palette.success.main
      : tone === "dirty"
        ? theme.palette.warning.main
        : tone === "ahead"
          ? theme.palette.success.main
          : tone === "behind"
            ? theme.palette.warning.main
            : tone === "remote"
              ? theme.palette.text.information
              : theme.palette.text.primary,
  backgroundColor:
    tone === "clean" || tone === "ahead"
      ? `color-mix(in srgb, ${theme.palette.success.main} 12%, transparent)`
      : tone === "dirty" || tone === "behind"
        ? `color-mix(in srgb, ${theme.palette.warning.main} 14%, transparent)`
        : theme.palette.surface.interface.backElevation,
}));

export const HeaderActions = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  // Don't shrink — at narrow widths (e.g. macOS min 1100) we'd rather have
  // the whole cluster wrap to its own row under the title than squeeze the
  // title text. Header has `flexWrap: wrap` so this wraps cleanly.
  flexShrink: 0,
  // When the cluster wraps to its own row, align it right to mirror the
  // desktop inline layout.
  marginLeft: "auto",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrimaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
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

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SecondaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 10px",
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

export const IconOnlyBtn = styled(SecondaryBtn)({
  width: 32,
  padding: 0,
  justifyContent: "center",
});

// Paired two-up grid. Both columns are equal width (`minmax(0, 1fr)` — the `0`
// min lets a column shrink instead of overflowing its content) and every card
// in a row is stretched to equal height (grid default `align-items: stretch`).
// Cards are ordered so similar-height siblings pair up; the per-card content
// fills the stretched height (see `CardSlot`), so equal heights read as
// intentional rather than leaving a void.
export const CardGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
}) as typeof Box;

// One grid cell. It's a `motion.div` so reflow/resize (column reordering, the
// card set changing when a provider connects) animates smoothly via the shared
// spring. `display: flex` + `& > * { flex: 1 }` forces whatever card primitive
// it wraps (the local `Card` or a `GeneralCard`-based CiCard/DeploymentsCard)
// to fill the full cell height — that's what makes the heights equal without
// touching each card component. `full` spans the whole row for a lone last card.
export const CardSlot = styled(motion.div, {
  shouldForwardProp: (p) => p !== "full",
})<{ full?: boolean }>(({ full }) => ({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  ...(full ? { gridColumn: "1 / -1" } : null),
  "& > *": {
    flex: 1,
    minWidth: 0,
  },
}));

export const Card = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
})) as typeof Box;

export const CardHead = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
}) as typeof Box;

export const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const CardMeta = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

export const ActivityBars = styled(Box)({
  height: 120,
  display: "flex",
  alignItems: "flex-end",
  gap: 6,
}) as typeof Box;

export const ActivityBar = styled(Box, {
  shouldForwardProp: (p) => p !== "heightPct" && p !== "hot",
})<{ heightPct: number; hot: boolean }>(({ theme, heightPct, hot }) => ({
  flex: 1,
  minWidth: 6,
  height: `${heightPct}%`,
  borderRadius: 8,
  backgroundColor: hot
    ? theme.palette.primary.main
    : `color-mix(in srgb, ${theme.palette.primary.main} 35%, transparent)`,
}));

export const ActivityAxis = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
})) as typeof Box;

export const CommitsList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 10,
  // Fill the stretched card height (equal-height rows) and scroll internally.
  flex: 1,
  minHeight: 0,
  maxHeight: 320,
  overflowY: "auto",
}) as typeof Box;

export const CommitRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
}) as typeof Box;

export const CommitMain = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const CommitMessage = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const CommitMeta = styled(Typography)(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
})) as typeof Typography;

export const PrRowSlot = styled(Box)({
  cursor: "pointer",
}) as typeof Box;

export const WorkingCopyScroll = styled(Box)({
  // Mirrors PrScroller: the Working-tree card can hold many files and would
  // blow the page height to thousands of pixels without an internal cap.
  flex: 1,
  minHeight: 0,
  maxHeight: 480,
  overflowY: "auto",
  // Sub-sections inside WorkingCopyPanel use `overflow: hidden`, so the
  // scroll lives here at the panel boundary.
}) as typeof Box;

export const CleanState = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  // Fill the stretched card so the celebrating mascot centres instead of
  // hugging the top with a void beneath.
  flex: 1,
  gap: 4,
  padding: "16px 0 8px",
}) as typeof Box;

export const CleanStateText = styled(Typography)(({ theme }) => ({
  marginTop: 8,
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Typography;

export const CleanStateSub = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Typography;

export const MissingRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
})) as typeof Box;

export const RemoteUrlText = styled(Box)(({ theme }) => ({
  fontFamily: MONO_STACK,
  fontSize: 11,
  color: theme.palette.text.secondary,
})) as typeof Box;

export const PrScroller = styled(Box)({
  // Fills the stretched card height (equal-height rows) and scrolls internally;
  // the maxHeight is the hard ceiling so a long PR list can't bloat the page.
  flex: 1,
  minHeight: 0,
  maxHeight: 480,
  overflowY: "auto",
}) as typeof Box;

export const CommitSha = styled(Box)({
  fontFamily: MONO_STACK,
}) as typeof Box;
