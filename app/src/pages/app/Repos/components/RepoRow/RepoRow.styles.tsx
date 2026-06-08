import { Box, ListItemIcon, MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PAGE_EASE,
  pgSlideL,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import { MONO_STACK } from "@/lib/utils/appearance.utils";

export const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.6fr) minmax(130px, 0.9fr) 110px 120px minmax(140px, auto)",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
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
  // Mount stagger: rows slide in from the left in quick succession. Tight
  // 20ms step + 200ms duration so 10 rows finish within ~400ms total.
  animation: `${pgSlideL} 200ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 20, count: 12 }),
  ...prefersReducedMotionGuard,
})) as typeof Box;

export const NameCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
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
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const Path = styled(Box)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const BranchCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
}) as typeof Box;

export const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 8px",
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 11.5,
  color: theme.palette.text.primary,
  maxWidth: 130,
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
  fontSize: 11.5,
  color: theme.palette.text.information,
})) as typeof Typography;

export const Diff = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  gap: 4,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
})) as typeof Box;

export const FilesMeta = styled(Typography)(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.informationLight,
  marginTop: 2,
})) as typeof Typography;

export const ActivityCell = styled(Box)({
  display: "flex",
  alignItems: "center",
}) as typeof Box;

export const Actions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 4,
}) as typeof Box;

export const DangerMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const DangerMenuIcon = styled(ListItemIcon)(({ theme }) => ({
  color: theme.palette.error.main,
}));
