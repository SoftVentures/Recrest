import { Box, Typography } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";

import { DIFF_ATTR } from "@/lib/constants/diff.constants";
import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const MONO = MONO_STACK;

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
}) as typeof Box;

export const FileBlock = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  backgroundColor: theme.palette.background.paper,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: a full-width clickable file header that toggles its hunks; keeps keyboard focus without nesting interactive elements
export const FileHeader = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  width: "100%",
  border: "none",
  background: theme.palette.surface.interface.base,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: pxToRems(8, 12),
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  color: theme.palette.text.primary,
  "&:hover": { background: theme.palette.surface.interface.active },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}));

export const FilePath = styled(Typography)({
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(12),
  fontWeight: 600,
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed status prop
export const StatusTag = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "add" | "remove" | "neutral";
}>(({ theme, tone }) => ({
  fontSize: fontPxToRem(9.5),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: pxToRems(1, 6),
  borderRadius: 100,
  color:
    tone === "add"
      ? toneText(theme, StatusTone.SUCCESS)
      : tone === "remove"
        ? toneText(theme, StatusTone.ERROR)
        : theme.palette.text.information,
  backgroundColor: theme.palette.surface.interface.backElevation,
}));

export const RenamedFrom = styled(Typography)(({ theme }) => ({
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.information,
})) as typeof Typography;

export const HunkHeader = styled(Box)(({ theme }) => ({
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  backgroundColor: theme.palette.surface.interface.backElevation,
  padding: pxToRems(3, 12),
  borderTop: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export const Lines = styled(Box)({
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

// Selection highlight is driven by a `data-sel` DOM attribute toggled directly
// during the drag (no React re-render per crossed line — that janks large
// diffs). A deliberately distinct blue, so it never blends with the red of a
// removed line or the green of an added one. Same blue in both modes, just a
// touch more opaque on dark.
const SELECT_BLUE = "#388bfd";
const SELECT_FILL_LIGHT = "rgba(56,139,253,0.22)";
const SELECT_FILL_DARK = "rgba(56,139,253,0.32)";
// Gentler tint for the comment-card-hover band (the drag band above is stronger).
const SELECT_HL_LIGHT = "rgba(56,139,253,0.10)";
const SELECT_HL_DARK = "rgba(56,139,253,0.14)";

// Build a blue "border box" from inset shadows (no layout shift): left + right
// on every covered line, top on the range's first line, bottom on its last.
function selectionBox(top?: boolean, bottom?: boolean): string {
  const edges = [`inset 2px 0 0 0 ${SELECT_BLUE}`, `inset -2px 0 0 0 ${SELECT_BLUE}`];
  if (top) edges.push(`inset 0 2px 0 0 ${SELECT_BLUE}`);
  if (bottom) edges.push(`inset 0 -2px 0 0 ${SELECT_BLUE}`);
  return edges.join(", ");
}

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed kind/selection props on a diff row
export const Line = styled("div", {
  shouldForwardProp: (p) => p !== "kind" && p !== "selected" && p !== "selTop" && p !== "selBottom",
})<{
  kind: "context" | "add" | "remove";
  /** Line is inside a posted comment's covered range → persistent border box. */
  selected?: boolean;
  /** First / last line of that range → close the box top / bottom. */
  selTop?: boolean;
  selBottom?: boolean;
}>(({ theme, kind, selected, selTop, selBottom }) => ({
  display: "grid",
  gridTemplateColumns: `${pxToRem(44)} ${pxToRem(44)} 1fr auto`,
  alignItems: "stretch",
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(12),
  lineHeight: 18 / 12,
  position: "relative",
  backgroundColor:
    kind === "add"
      ? theme.palette.mode === "dark"
        ? "rgba(46,160,67,0.15)"
        : "rgba(46,160,67,0.12)"
      : kind === "remove"
        ? theme.palette.mode === "dark"
          ? "rgba(248,81,73,0.15)"
          : "rgba(248,81,73,0.10)"
        : "transparent",
  // A posted comment's covered lines keep a blue border box so the range stays
  // visible. The live drag / card-hover band (below) only adds the fill, so it
  // layers on top of this box without erasing it.
  ...(selected ? { boxShadow: selectionBox(selTop, selBottom) } : {}),
  // Fill-only (no boxShadow) so the comment border box survives underneath.
  // `data-sel` is the live drag band (stronger); `data-hl` is the gentler tint
  // shown while hovering a comment card.
  [`&[${DIFF_ATTR.selected}]`]: {
    backgroundColor: theme.palette.mode === "dark" ? SELECT_FILL_DARK : SELECT_FILL_LIGHT,
  },
  [`&[${DIFF_ATTR.highlight}]`]: {
    backgroundColor: theme.palette.mode === "dark" ? SELECT_HL_DARK : SELECT_HL_LIGHT,
  },
  // Reveal the affordance only while the cursor is over this specific line (or
  // the button is keyboard-focused). `pointer-events: auto` only when visible
  // so the invisible-but-present button never swallows clicks meant for the
  // line content. The range itself is built by dragging from this button, not
  // by revealing every line's button at once.
  "&:hover .diff-comment-affordance, & .diff-comment-affordance:focus-visible": {
    opacity: 1,
    pointerEvents: "auto",
  },
}));

export const Gutter = styled(Box)(({ theme }) => ({
  textAlign: "right",
  padding: pxToRems(0, 6),
  color: theme.palette.text.informationLight,
  userSelect: "none",
  fontSize: fontPxToRem(11),
  borderRight: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export const Sign = styled(Box)({
  width: pxToRem(14),
  textAlign: "center",
  display: "inline-block",
}) as typeof Box;

export const Content = styled(Box)({
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  paddingRight: pxToRem(8),
  display: "flex",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: a hover-revealed per-line affordance that must stay keyboard-focusable
export const CommentAffordance = styled("button")(({ theme }) => ({
  alignSelf: "center",
  marginRight: pxToRem(6),
  width: pxToRem(18),
  height: pxToRem(18),
  borderRadius: 4,
  border: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  // Default-hidden + non-interactive. The Line:hover rule (and the
  // focus-visible rule below) flips both back on simultaneously so the
  // invisible button can never silently swallow a click that should hit
  // the diff content underneath.
  opacity: 0,
  pointerEvents: "none",
  transition: "opacity 120ms ease",
  padding: 0,
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));

export const CommentRow = styled(Box)(({ theme }) => ({
  gridColumn: "1 / -1",
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: theme.palette.surface.interface.base,
  padding: pxToRems(8, 12),
})) as typeof Box;

export const PostedComment = styled(Box)(({ theme }) => ({
  gridColumn: "1 / -1",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  background: theme.palette.surface.interface.backElevation,
  margin: pxToRems(6, 10),
  padding: pxToRems(8, 12),
  fontFamily: theme.typography.fontFamily,
  fontSize: fontPxToRem(12),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
  transition: "border-color 120ms ease",
  // Hovering the card sharpens its border (and, via JS, gives its covered lines
  // a gentle tint so you can see which lines it refers to).
  "&:hover": {
    borderColor: SELECT_BLUE,
  },
})) as typeof Box;

export const PostedHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
}) as typeof Box;

export const PostedAuthor = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.primary,
})) as typeof Typography;

export const PostedBody = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.primary,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
})) as typeof Box;

export const RangeBadge = styled(Box)(({ theme }) => ({
  fontFamily: MONO,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: fontPxToRem(10),
  fontWeight: 600,
  padding: pxToRems(1, 6),
  marginRight: pxToRem(6),
  borderRadius: 100,
  color: theme.palette.primary.main,
  backgroundColor: alpha(theme.palette.primary.main, 0.12),
})) as typeof Box;

export const Empty = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  padding: pxToRems(8, 4),
})) as typeof Typography;
