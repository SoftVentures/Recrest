import { CircularProgress, type CircularProgressProps } from "@mui/material";

export interface GeneralSpinnerProps extends Omit<CircularProgressProps, "size"> {
  size?: number;
}

function GeneralSpinner({ size = 14, ...rest }: GeneralSpinnerProps) {
  return <CircularProgress size={size} {...rest} />;
}

export default GeneralSpinner;
