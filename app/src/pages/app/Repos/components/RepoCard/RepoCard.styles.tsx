import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgRise,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Card = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
  padding: pxToRem(14),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  cursor: "pointer",
  transition: "border-color 0.12s ease, background-color 0.12s ease",
  "&:hover": {
    borderColor: theme.palette.border.hover,
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&[data-selected='true'], &[data-context-menu-open='true']": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,
    borderColor: theme.palette.primary.main,
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 10%, transparent)`,
  },
  // A repo whose folder vanished reads as stale: the body fades out while the
  // action cluster and the footer (which carries the "folder missing" badge)
  // stay at full strength. Opacity creates a stacking group, so the exemptions
  // have to be direct children, not nested nodes.
  "&[data-missing='true'] > *:not([data-missing-keep])": {
    opacity: 0.4,
    filter: "grayscale(1)",
  },
  // Mount stagger: cards rise in row by row.
  animation: `${pgRise} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 40, count: 10 }),
  ...prefersReducedMotionGuard,
})) as typeof Box;

export const CardTop = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(8),
}) as typeof Box;

export const Actions = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: pxToRem(2),
  padding: pxToRem(3),
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 6px -2px rgba(0, 0, 0, 0.08)",
})) as typeof Box;

export const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
  minWidth: 0,
}) as typeof Box;

export const Name = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(14),
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
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

export const BranchRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  marginTop: pxToRem(4),
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
  maxWidth: pxToRem(170),
  minWidth: 0,
})) as typeof Box;

export const BranchText = styled(Box)({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
}) as typeof Box;

export const Footer = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(8),
}) as typeof Box;

export const StatusGroup = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  minWidth: 0,
}) as typeof Box;

export const StatusDot = styled(Box)(({ theme }) => ({
  width: pxToRem(6),
  height: pxToRem(6),
  borderRadius: "50%",
  backgroundColor: theme.palette.success.main,
  flexShrink: 0,
  "&[data-dirty='true']": {
    backgroundColor: theme.palette.warning.main,
  },
})) as typeof Box;

export const StatusText = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
})) as typeof Typography;

export const Diff = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
})) as typeof Box;

export const FilesMeta = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.information,
  fontWeight: 400,
})) as typeof Typography;
