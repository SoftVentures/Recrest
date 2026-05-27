import { Select } from "@mui/material";
import { styled } from "@mui/material/styles";

export const SelectControl = styled(Select)(({ theme }) => ({
  minWidth: 180,
  height: 32,
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderRadius: 8,
  fontSize: 12.5,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
}));
