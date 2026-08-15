import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

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
  gap: pxToRem(2),
  padding: pxToRems(4, 6),
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
  width: pxToRem(28),
  height: pxToRem(28),
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
  height: pxToRem(18),
  margin: pxToRems(0, 4),
  backgroundColor: theme.palette.divider,
})) as typeof Box;

export const Surface = styled(Box)(({ theme }) => ({
  // The TipTap editor mounts a `<div class="ProseMirror">` inside this
  // surface — style its content via descendant selectors so we don't have
  // to reach into the React tree.
  flex: 1,
  minHeight: pxToRem(120),
  padding: pxToRems(10, 12),
  color: theme.palette.text.primary,
  fontSize: fontPxToRem(13),
  lineHeight: 1.55,
  "& .ProseMirror": {
    outline: "none",
    minHeight: pxToRem(100),
    "& > *:first-of-type": { marginTop: 0 },
    "& > *:last-child": { marginBottom: 0 },
    "& p": { margin: pxToRems(0, 0, 8) },
    "& h1, & h2, & h3": {
      margin: pxToRems(14, 0, 6),
      fontWeight: 700,
      lineHeight: 1.3,
    },
    "& h1": { fontSize: fontPxToRem(18) },
    "& h2": { fontSize: fontPxToRem(16) },
    "& h3": { fontSize: fontPxToRem(14) },
    "& ul, & ol": { margin: pxToRems(0, 0, 8), paddingLeft: pxToRem(22) },
    "& a": {
      color: theme.palette.primary.main,
      textDecoration: "underline",
    },
    "& code": {
      fontFamily: MONO,
      fontFeatureSettings: CODE_LIGATURES,
      fontSize: fontPxToRem(12),
      padding: pxToRems(1, 5),
      borderRadius: 4,
      backgroundColor: theme.palette.surface.interface.backElevation,
    },
    "& pre": {
      padding: pxToRem(10),
      borderRadius: 8,
      backgroundColor: theme.palette.surface.interface.backElevation,
      border: `1px solid ${theme.palette.divider}`,
      overflowX: "auto",
      fontSize: fontPxToRem(12),
      "& code": {
        padding: 0,
        backgroundColor: "transparent",
      },
    },
    "& blockquote": {
      margin: 0,
      padding: pxToRems(2, 12),
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
