import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
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
  gap: 8,
  width: "100%",
  border: "none",
  background: theme.palette.surface.interface.base,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: "8px 12px",
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
  fontSize: 12,
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
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "1px 6px",
  borderRadius: 100,
  color:
    tone === "add"
      ? theme.palette.success.dark
      : tone === "remove"
        ? theme.palette.error.dark
        : theme.palette.text.information,
  backgroundColor: theme.palette.surface.interface.backElevation,
}));

export const RenamedFrom = styled(Typography)(({ theme }) => ({
  fontFamily: MONO,
  fontSize: 10.5,
  color: theme.palette.text.information,
})) as typeof Typography;

export const HunkHeader = styled(Box)(({ theme }) => ({
  fontFamily: MONO,
  fontSize: 11,
  color: theme.palette.text.information,
  backgroundColor: theme.palette.surface.interface.backElevation,
  padding: "3px 12px",
  borderTop: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export const Lines = styled(Box)({
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed kind prop on a diff row
export const Line = styled("div", { shouldForwardProp: (p) => p !== "kind" })<{
  kind: "context" | "add" | "remove";
}>(({ theme, kind }) => ({
  display: "grid",
  gridTemplateColumns: "44px 44px 1fr auto",
  alignItems: "stretch",
  fontFamily: MONO,
  fontSize: 12,
  lineHeight: "18px",
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
  // Reveal the affordance while the cursor is over this specific line and
  // while the button itself is keyboard-focused. `pointer-events: auto` only
  // when visible so the invisible-but-present button never silently captures
  // clicks that should reach the underlying line content.
  "&:hover .diff-comment-affordance, & .diff-comment-affordance:focus-visible": {
    opacity: 1,
    pointerEvents: "auto",
  },
}));

export const Gutter = styled(Box)(({ theme }) => ({
  textAlign: "right",
  padding: "0 6px",
  color: theme.palette.text.informationLight,
  userSelect: "none",
  fontSize: 11,
  borderRight: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export const Sign = styled(Box)({
  width: 14,
  textAlign: "center",
  display: "inline-block",
}) as typeof Box;

export const Content = styled(Box)({
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  paddingRight: 8,
  display: "flex",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: a hover-revealed per-line affordance that must stay keyboard-focusable
export const CommentAffordance = styled("button")(({ theme }) => ({
  alignSelf: "center",
  marginRight: 6,
  width: 18,
  height: 18,
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
  padding: "8px 12px",
})) as typeof Box;

export const PostedComment = styled(Box)(({ theme }) => ({
  gridColumn: "1 / -1",
  borderTop: `1px solid ${theme.palette.divider}`,
  background: theme.palette.surface.interface.backElevation,
  padding: "6px 12px",
  fontFamily: theme.typography.fontFamily,
  fontSize: 12,
})) as typeof Box;

export const PostedAuthor = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: 11,
  color: theme.palette.text.primary,
  marginRight: 6,
})) as typeof Typography;

export const Empty = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "8px 4px",
})) as typeof Typography;
