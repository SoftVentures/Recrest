import { Box, ListItemIcon, MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PAGE_EASE,
  pgSlideL,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: `minmax(${pxToRem(220)}, 1.6fr) minmax(${pxToRem(130)}, 0.9fr) ${pxToRem(110)} ${pxToRem(120)} minmax(${pxToRem(140)}, auto)`,
  alignItems: "center",
  gap: pxToRem(12),
  padding: pxToRems(10, 16),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  backgroundColor: "transparent",
  transition: "background-color 0.12s ease",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&[data-selected='true'], &[data-context-menu-open='true']": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 10%, transparent)`,
  },
  // The inline pin sits idle until the row is hovered/selected; an already
  // pinned repo keeps it lit (handled by the slot's own data attribute).
  [`&:hover [data-pin-slot], &[data-selected='true'] [data-pin-slot]`]: {
    opacity: 1,
  },
  // A repo whose folder vanished reads as stale: everything fades except the
  // status cell (which carries the "folder missing" badge) and the actions
  // (which carry the way out). Opacity creates a stacking group, so the
  // exemptions have to be direct children, not nested nodes.
  "&[data-missing='true'] > *:not([data-missing-keep])": {
    opacity: 0.4,
    filter: "grayscale(1)",
  },
  // Mount stagger: rows slide in from the left in quick succession. Tight
  // 20ms step + 200ms duration so 10 rows finish within ~400ms total.
  animation: `${pgSlideL} 200ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 20, count: 12 }),
  ...prefersReducedMotionGuard,
})) as typeof Box;

export const NameCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  minWidth: 0,
}) as typeof Box;

export const PinSlot = styled(Box)({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  opacity: 0,
  transition: "opacity 120ms ease",
  "&[data-pinned='true']": { opacity: 1 },
  'html[data-reduced-motion="true"] &': { transition: "none" },
}) as typeof Box;

export const TextCol = styled(Box)({ minWidth: 0 }) as typeof Box;

export const Name = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const Path = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const BranchCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  minWidth: 0,
}) as typeof Box;

export const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(5),
  padding: pxToRems(3, 8),
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.primary,
  maxWidth: pxToRem(130),
  minWidth: 0,
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

export const BranchText = styled(Box)({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
}) as typeof Box;

export const StatusCell = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
}) as typeof Box;

export const StatusText = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
})) as typeof Typography;

export const Diff = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  gap: pxToRem(4),
  fontSize: fontPxToRem(11),
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  // `success.main`/`error.main` are mode-independent light-mode hues, so on the
  // dark surfaces they landed at 3.18:1 / 2.57:1. `toneText` is the existing
  // mode-aware rule for exactly these diff counters.
  "& .add": { color: toneText(theme, StatusTone.SUCCESS) },
  "& .rem": { color: toneText(theme, StatusTone.ERROR) },
})) as typeof Box;

export const FilesMeta = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.informationLight,
  marginTop: pxToRem(2),
})) as typeof Typography;

export const ActivityCell = styled(Box)({
  display: "flex",
  alignItems: "center",
}) as typeof Box;

export const Actions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: pxToRem(4),
}) as typeof Box;

export const DangerMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const DangerMenuIcon = styled(ListItemIcon)(({ theme }) => ({
  color: theme.palette.error.main,
}));
