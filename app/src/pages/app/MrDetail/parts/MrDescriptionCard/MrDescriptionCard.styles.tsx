import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { pxToRem } from "@/theme/scale";

export const Editor = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
}) as typeof Box;

export const EditorActions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  gap: pxToRem(8),
}) as typeof Box;
