import { Select } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem } from "@/theme/scale";

export const SelectControl = styled(Select)(({ theme }) => ({
  minWidth: pxToRem(180),
  minHeight: pxToRem(32),
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderRadius: 8,
  fontSize: fontPxToRem(12.5),
  "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.divider },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(8),
    paddingTop: pxToRem(4),
    paddingBottom: pxToRem(4),
  },
}));
