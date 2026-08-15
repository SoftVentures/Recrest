import { Box, MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

// Standard filter MenuItem chrome used inside <Menu>-based filter popovers
// across the app (Branches, MergeRequests). Lives at the molecule layer so
// pages don't have to cross-import each other's `_shared` modules.

export const FilterItem = styled(MenuItem)({
  position: "relative",
  fontSize: fontPxToRem(13),
  minHeight: pxToRem(30),
  paddingTop: pxToRem(6),
  paddingBottom: pxToRem(6),
  paddingLeft: pxToRem(32),
  paddingRight: pxToRem(8),
  gap: pxToRem(8),
  borderRadius: 8,
  margin: pxToRems(0, 4),
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiListItemText-primary": { fontSize: fontPxToRem(13) },
});

export const LeadingSlot = styled(Typography)(({ theme }) => ({
  position: "absolute",
  left: pxToRem(8),
  top: "50%",
  width: pxToRem(14),
  height: pxToRem(14),
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.primary,
  flexShrink: 0,
})) as typeof Typography;

export const CountSpan = styled(Typography)(({ theme }) => ({
  marginLeft: "auto",
  fontSize: fontPxToRem(10),
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.information,
})) as typeof Typography;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
  padding: pxToRems(6, 12, 4),
})) as typeof Typography;

export const AvatarSlot = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}) as typeof Box;
