import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";

const MONO = MONO_STACK;

export const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  backgroundColor: theme.palette.background.default,
  "&:focus-within": {
    borderColor: theme.palette.border.hover,
  },
})) as typeof Box;

export const Toolbar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 2,
  padding: "4px 6px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: keyboard-focusable toolbar control inside an editor
export const ToolButton = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "none",
  background: active ? theme.palette.surface.interface.active : "transparent",
  color: active ? theme.palette.text.primary : theme.palette.text.information,
  cursor: "pointer",
  padding: 0,
  transition: "background-color 100ms ease, color 100ms ease",
  "&:hover": {
    background: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
  "&:disabled": { opacity: 0.4, cursor: "not-allowed" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,
  },
}));

export const Divider = styled(Box)(({ theme }) => ({
  width: 1,
  height: 18,
  margin: "0 4px",
  backgroundColor: theme.palette.divider,
})) as typeof Box;

export const Surface = styled(Box)(({ theme }) => ({
  // The TipTap editor mounts a `<div class="ProseMirror">` inside this
  // surface — style its content via descendant selectors so we don't have
  // to reach into the React tree.
  flex: 1,
  minHeight: 120,
  padding: "10px 12px",
  color: theme.palette.text.primary,
  fontSize: 13,
  lineHeight: 1.55,
  "& .ProseMirror": {
    outline: "none",
    minHeight: 100,
    "& > *:first-of-type": { marginTop: 0 },
    "& > *:last-child": { marginBottom: 0 },
    "& p": { margin: "0 0 8px" },
    "& h1, & h2, & h3": {
      margin: "14px 0 6px",
      fontWeight: 700,
      lineHeight: 1.3,
    },
    "& h1": { fontSize: 18 },
    "& h2": { fontSize: 16 },
    "& h3": { fontSize: 14 },
    "& ul, & ol": { margin: "0 0 8px", paddingLeft: 22 },
    "& a": {
      color: theme.palette.primary.main,
      textDecoration: "underline",
    },
    "& code": {
      fontFamily: MONO,
      fontFeatureSettings: CODE_LIGATURES,
      fontSize: 12,
      padding: "1px 5px",
      borderRadius: 4,
      backgroundColor: theme.palette.surface.interface.backElevation,
    },
    "& pre": {
      padding: 10,
      borderRadius: 8,
      backgroundColor: theme.palette.surface.interface.backElevation,
      border: `1px solid ${theme.palette.divider}`,
      overflowX: "auto",
      fontSize: 12,
      "& code": {
        padding: 0,
        backgroundColor: "transparent",
      },
    },
    "& blockquote": {
      margin: 0,
      padding: "2px 12px",
      borderLeft: `3px solid ${theme.palette.divider}`,
      color: theme.palette.text.information,
    },
    // Placeholder shown when the editor doc is empty — driven by the
    // tiptap placeholder extension via `data-placeholder` on the first
    // paragraph.
    "& p.is-editor-empty:first-of-type::before": {
      content: "attr(data-placeholder)",
      float: "left",
      color: theme.palette.text.informationLight,
      pointerEvents: "none",
      height: 0,
    },
  },
})) as typeof Box;
