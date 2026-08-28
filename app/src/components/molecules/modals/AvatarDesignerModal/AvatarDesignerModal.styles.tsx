import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Layout = styled(Box)({
  display: "flex",
  gap: pxToRem(20),
  alignItems: "flex-start",
  minWidth: 0,
}) as typeof Box;

export const PreviewCol = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: pxToRem(8),
  flexShrink: 0,
}) as typeof Box;

export const PreviewLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.information,
})) as typeof Typography;

export const Pickers = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(16),
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const Section = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
}) as typeof Box;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.information,
})) as typeof Typography;

export const SwatchGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: pxToRem(8),
  // The selected swatch's outline (and hover scale) extend beyond the cell;
  // the modal content clips overflow, so pad the grid to keep the ring of the
  // edge swatches (esp. the rightmost column) from being cut off.
  padding: pxToRem(4),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button>: selectable swatch must be keyboard-focusable without nested-interactive issues
export const Swatch = styled("button", {
  shouldForwardProp: (p) => p !== "background" && p !== "selected",
})<{ background: string; selected: boolean }>(({ theme, background, selected }) => ({
  aspectRatio: "1 / 1",
  width: "100%",
  borderRadius: 8,
  background,
  cursor: "pointer",
  padding: 0,
  border: selected
    ? `2px solid ${theme.palette.primary.main}`
    : `1px solid ${theme.palette.divider}`,
  outline: selected ? `2px solid ${theme.palette.primary.main}` : "none",
  outlineOffset: 1,
  transition: "transform 120ms ease",
  "&:hover": { transform: "scale(1.08)" },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));

export const IconScroll = styled(Box)(({ theme }) => ({
  maxHeight: pxToRem(168),
  overflowY: "auto",
  paddingRight: pxToRem(4),
  // Keep the scrollbar subtle so the dense grid stays the focus.
  scrollbarWidth: "thin",
  "&::-webkit-scrollbar": { width: pxToRem(8) },
  "&::-webkit-scrollbar-thumb": {
    background: theme.palette.divider,
    borderRadius: 8,
  },
})) as typeof Box;

export const IconGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(10, 1fr)",
  gap: pxToRem(8),
}) as typeof Box;

export const NoMatches = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  padding: pxToRems(12, 0),
})) as typeof Box;

export const IconHeader = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(12),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button>: selectable icon tile, same rationale as Swatch
export const IconTile = styled("button", {
  shouldForwardProp: (p) => p !== "selected",
})<{ selected: boolean }>(({ theme, selected }) => ({
  aspectRatio: "1 / 1",
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  cursor: "pointer",
  padding: 0,
  color: selected ? theme.palette.primary.main : theme.palette.text.information,
  background: selected
    ? theme.palette.surface.interface.active
    : theme.palette.surface.interface.backElevation,
  border: selected
    ? `1px solid ${theme.palette.primary.main}`
    : `1px solid ${theme.palette.divider}`,
  transition: "color 120ms ease, background 120ms ease",
  "&:hover": {
    color: theme.palette.text.primary,
    background: theme.palette.surface.interface.active,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));
