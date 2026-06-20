import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { frostedPanel } from "@/lib/utils/translucency.utils";

export { default as Kbd } from "@/components/atoms/inputs/Kbd";

export const Backdrop = styled(Box)({
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "10vh",
  background: "rgba(10, 11, 15, 0.4)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
}) as typeof Box;

export const Panel = styled(Box)(({ theme }) => ({
  width: "100%",
  maxWidth: 560,
  // Denser than a confirm dialog (scrolling result list), so a higher tint
  // keeps the items readable against the blurred backdrop.
  ...frostedPanel(theme, 0.78),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
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

export const ResultsList = styled(Box)({
  maxHeight: "60vh",
  overflowY: "auto",
  padding: 6,
  margin: 0,
  listStyle: "none",
}) as typeof Box;

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
