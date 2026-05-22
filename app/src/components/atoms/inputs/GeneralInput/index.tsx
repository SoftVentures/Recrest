import { forwardRef } from "react";

import { TextField, type TextFieldProps } from "@mui/material";

export type GeneralInputProps = Omit<TextFieldProps, "variant">;

const GeneralInput = forwardRef<HTMLDivElement, GeneralInputProps>(function GeneralInput(
  { size = "small", fullWidth = true, ...rest },
  ref,
) {
  return <TextField ref={ref} variant="outlined" size={size} fullWidth={fullWidth} {...rest} />;
});

export default GeneralInput;
