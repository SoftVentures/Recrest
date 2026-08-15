import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const Item = styled(MenuItem)({
  minHeight: pxToRem(32),
  fontSize: fontPxToRem(13),
  paddingTop: pxToRem(6),
  paddingBottom: pxToRem(6),
  paddingLeft: pxToRem(12),
  paddingRight: pxToRem(12),
  gap: pxToRem(8),
  borderRadius: 6,
  margin: pxToRems(0, 4),
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    color: "inherit",
  },
});

export const PrimaryItem = styled(Item)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

export const DangerItem = styled(Item)(({ theme }) => ({
  color: theme.palette.error.main,
  "& .MuiListItemIcon-root": { color: theme.palette.error.main },
  "&:hover": {
    backgroundColor: `color-mix(in srgb, ${theme.palette.error.main} 8%, transparent)`,
  },
}));

export const Separator = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(0.5, 1),
  borderColor: theme.palette.divider,
}));

export { ListItemIcon, ListItemText };
