import { Box, Menu, MenuItem, Typography } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { frostedPanel } from "@/lib/utils/translucency.utils";

export { default as Kbd } from "@/components/atoms/inputs/Kbd";

export const Backdrop = styled(Box)(({ theme }) => ({
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "10vh",
  // A near-black 40% scrim is right for the dark UI, but in light mode it
  // dims the whole app to a muddy grey and the translucent panel reads as
  // washed-out over it. Use a soft neutral scrim in light mode instead.
  background:
    theme.palette.mode === "light"
      ? alpha(theme.palette.common.black, 0.14)
      : "rgba(10, 11, 15, 0.4)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
})) as typeof Box;

export const Panel = styled(Box)(({ theme }) => ({
  width: "100%",
  maxWidth: 560,
  // Denser than a confirm dialog (scrolling result list), so a higher tint
  // keeps the items readable against the blurred backdrop. Light mode needs a
  // touch more opacity still — the light scrim lets more of the busy page
  // bleed through the glass.
  ...frostedPanel(theme, theme.palette.mode === "light" ? 0.9 : 0.78),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  boxShadow:
    theme.palette.mode === "light"
      ? "0 16px 48px rgba(15, 23, 42, 0.18)"
      : "0 20px 40px rgba(0, 0, 0, 0.25)",
  overflow: "hidden",
  color: theme.palette.text.primary,
})) as typeof Box;

export const Head = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 14px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <input> required for keyboard / IME / autofocus semantics
export const Input = styled("input")(({ theme }) => ({
  flex: 1,
  height: 46,
  background: "transparent",
  border: 0,
  outline: "none",
  color: theme.palette.text.primary,
  fontSize: 13.5,
  fontFamily: "inherit",
  "&::placeholder": { color: theme.palette.text.information },
}));

export const Kbds = styled(Box)({
  display: "inline-flex",
  gap: 4,
}) as typeof Box;

export const TabBar = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 4,
  padding: "0 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  flexShrink: 0,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const TabButton = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active: boolean }>(({ theme, active }) => ({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 10px",
  background: "transparent",
  border: 0,
  marginBottom: -1,
  color: active ? theme.palette.text.primary : theme.palette.text.information,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "color 0.12s ease",
  "&:hover:not(:disabled)": { color: theme.palette.text.primary },
  "&:disabled": { opacity: 0.45, cursor: "not-allowed" },
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: active ? theme.palette.primary.main : "transparent",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
}));

export const ResultsList = styled(Box)({
  maxHeight: "60vh",
  overflowY: "auto",
  padding: 6,
  margin: 0,
  listStyle: "none",
}) as typeof Box;

export const ScopeRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
})) as typeof Box;

// Custom dropdown (not a native <select>) so each option can show the repo
// avatar — <option> only renders text.
// eslint-disable-next-line no-restricted-syntax -- native <button> trigger for the repo-scope dropdown
export const ScopeTrigger = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  maxWidth: 240,
  padding: "0 8px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12,
  cursor: "pointer",
  "&:hover": { borderColor: theme.palette.border.hover },
  "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
}));

export const ScopeTriggerLabel = styled(Typography)({
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: 12,
}) as typeof Typography;

/** Placeholder glyph standing in for an avatar on the "all repositories" row so
 *  its label aligns with the avatared repo rows. */
export const ScopeAllGlyph = styled(Box)(({ theme }) => ({
  width: 18,
  height: 18,
  flexShrink: 0,
  borderRadius: 5,
  background: theme.palette.surface.interface.active,
  border: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export const ScopeMenu = styled(Menu)(({ theme }) => ({
  // Above the palette backdrop (zIndex 1300) so the portaled menu isn't masked.
  zIndex: theme.zIndex.modal + 10,
}));

export const ScopeMenuItem = styled(MenuItem)({
  display: "flex",
  gap: 8,
  minHeight: 34,
  fontSize: 12.5,
}) as typeof MenuItem;

export const ScopeOptionLabel = styled(Typography)({
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: 12.5,
}) as typeof Typography;

export const StatusText = styled(Typography)(({ theme }) => ({
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

export const Hint = styled(Box)(({ theme }) => ({
  padding: "28px 12px",
  textAlign: "center",
  fontSize: 12,
  color: theme.palette.text.information,
  listStyle: "none",
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const ContentRow = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  width: "100%",
  padding: "7px 10px",
  backgroundColor: active
    ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
    : "transparent",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
}));

export const ContentTop = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
  color: theme.palette.text.primary,
})) as typeof Box;

export const ContentPath = styled(Typography)({
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: 500,
}) as typeof Typography;

export const ContentLineNo = styled(Typography)(({ theme }) => ({
  flexShrink: 0,
  fontSize: 11,
  fontFamily: MONO_STACK,
  color: theme.palette.text.information,
})) as typeof Typography;

export const ContentSnippet = styled(Typography)(({ theme }) => ({
  paddingLeft: 21,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: 11.5,
  fontFamily: MONO_STACK,
  color: theme.palette.text.information,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- semantic <mark> to highlight the query match within a snippet
export const SnippetMark = styled("mark")(({ theme }) => ({
  background: "transparent",
  color: theme.palette.primary.main,
  fontWeight: 700,
}));

export const GroupLabel = styled(Box)(({ theme }) => ({
  padding: "8px 10px 4px",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: theme.palette.text.information,
})) as typeof Box;

export const Divider = styled(Box)(({ theme }) => ({
  height: 1,
  backgroundColor: theme.palette.divider,
  margin: "6px 4px",
  listStyle: "none",
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const Row = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 10px",
  backgroundColor: active
    ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
    : "transparent",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
  color: active ? toneText(theme, StatusTone.PRIMARY) : theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 13,
  textAlign: "left",
  "& .row-icon, & .row-hint": {
    color: active ? toneText(theme, StatusTone.PRIMARY) : theme.palette.text.information,
  },
  "& .row-hint": {
    opacity: active ? 0.7 : 1,
  },
}));

export const RowIcon = styled(Box)({
  width: 22,
  height: 22,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}) as typeof Box;

export const RowLabel = styled(Typography)({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: 500,
}) as typeof Typography;

export const RowHint = styled(Typography)({
  fontSize: 11.5,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "52%",
  fontFamily: MONO_STACK,
}) as typeof Typography;

export const Empty = styled(Box)(({ theme }) => ({
  padding: "28px 12px",
  textAlign: "center",
  fontSize: 12,
  color: theme.palette.text.information,
  listStyle: "none",
})) as typeof Box;
