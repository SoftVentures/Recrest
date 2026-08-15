import { MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

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
  "& .MuiListItemText-primary": {
    fontSize: fontPxToRem(13),
  },
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

export const RadioDot = styled(Typography)(({ theme }) => ({
  width: pxToRem(8),
  height: pxToRem(8),
  borderRadius: "50%",
  backgroundColor: theme.palette.text.primary,
})) as typeof Typography;
