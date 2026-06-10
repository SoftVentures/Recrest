import { MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const FilterItem = styled(MenuItem)({
  position: "relative",
  fontSize: 13,
  minHeight: 30,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 32,
  paddingRight: 8,
  gap: 8,
  borderRadius: 8,
  margin: "0 4px",
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiListItemText-primary": {
    fontSize: 13,
  },
});

export const LeadingSlot = styled(Typography)(({ theme }) => ({
  position: "absolute",
  left: 8,
  top: "50%",
  width: 14,
  height: 14,
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.primary,
  flexShrink: 0,
})) as typeof Typography;

export const RadioDot = styled(Typography)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: theme.palette.text.primary,
})) as typeof Typography;
