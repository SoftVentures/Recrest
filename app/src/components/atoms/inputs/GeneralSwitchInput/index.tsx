import { forwardRef } from "react";

import { type SwitchProps as MuiSwitchProps, Switch } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface GeneralSwitchInputProps extends Omit<MuiSwitchProps, "onChange"> {
  onCheckedChange?: (checked: boolean) => void;
  onChange?: MuiSwitchProps["onChange"];
}

/**
 * Apple-style switch in monochrome — the Apple shape (wide rounded track,
 * white thumb with a soft drop shadow, springy thumb travel) but recoloured
 * to a black/white palette per Recrest's design language. Light theme: off =
 * pale-gray track, on = near-black track. Dark theme inverts to white/charcoal.
 * Pre-MUI src-old used the same monochrome treatment — restoring that here.
 */
const StyledSwitch = styled(Switch)(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,

  "& .MuiSwitch-switchBase": {
    padding: 0,
    margin: 2,
    transitionDuration: "260ms",
    "&.Mui-checked": {
      transform: "translateX(16px)",
      color: theme.palette.mode === "dark" ? "#0f1115" : "#ffffff",
      "& + .MuiSwitch-track": {
        backgroundColor: theme.palette.mode === "dark" ? "#ffffff" : "#0f1115",
        opacity: 1,
        border: 0,
      },
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: 0.5,
      },
    },
    "&.Mui-focusVisible .MuiSwitch-thumb": {
      color: theme.palette.mode === "dark" ? "#ffffff" : "#0f1115",
      border: `6px solid ${theme.palette.background.paper}`,
    },
    "&.Mui-disabled .MuiSwitch-thumb": {
      color: theme.palette.grey[100],
    },
    "&.Mui-disabled + .MuiSwitch-track": {
      opacity: 0.7,
    },
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: 22,
    height: 22,
    boxShadow: "0 3px 1px rgba(0,0,0,0.06), 0 3px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.mode === "dark" ? "#39393D" : "#E9E9EA",
    opacity: 1,
    transition: theme.transitions.create(["background-color"], { duration: 260 }),
  },
}));

const GeneralSwitchInput = forwardRef<HTMLButtonElement, GeneralSwitchInputProps>(
  function GeneralSwitchInput({ onCheckedChange, onChange, ...rest }, ref) {
    return (
      <StyledSwitch
        ref={ref}
        disableRipple
        onChange={(e, checked) => {
          onChange?.(e, checked);
          onCheckedChange?.(checked);
        }}
        {...rest}
      />
    );
  },
);

export default GeneralSwitchInput;
