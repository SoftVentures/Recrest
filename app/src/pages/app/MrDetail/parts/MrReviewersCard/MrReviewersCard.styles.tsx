import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const ReviewerForm = styled(Box)({
  marginTop: pxToRem(12),
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <input> required: keyboard-focusable single-line text input with autoFocus; Box composed with `component="input"` loses the typed onChange surface
export const TextInput = styled("input")(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  minHeight: pxToRem(30),
  padding: pxToRems(0, 10),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: fontPxToRem(12.5),
  fontFamily: "inherit",
  outline: "none",
  "&:focus": { borderColor: theme.palette.border.hover },
}));
