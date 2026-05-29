import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Editor = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

export const EditorActions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
}) as typeof Box;
