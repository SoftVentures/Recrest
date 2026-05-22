import { forwardRef } from "react";

import { Checkbox, type CheckboxProps as MuiCheckboxProps } from "@mui/material";

export interface GeneralCheckboxInputProps extends Omit<MuiCheckboxProps, "onChange"> {
  onCheckedChange?: (checked: boolean) => void;
  onChange?: MuiCheckboxProps["onChange"];
}

const GeneralCheckboxInput = forwardRef<HTMLButtonElement, GeneralCheckboxInputProps>(
  function GeneralCheckboxInput({ onCheckedChange, onChange, ...rest }, ref) {
    return (
      <Checkbox
        ref={ref}
        onChange={(e, checked) => {
          onChange?.(e, checked);
          onCheckedChange?.(checked);
        }}
        {...rest}
      />
    );
  },
);

export default GeneralCheckboxInput;
