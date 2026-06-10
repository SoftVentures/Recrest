import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Item = styled(MenuItem)({
  minHeight: 32,
  fontSize: 13,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 12,
  paddingRight: 12,
  gap: 8,
  borderRadius: 6,
  margin: "0 4px",
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
