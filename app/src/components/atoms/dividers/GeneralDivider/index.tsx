import { Divider, type DividerProps } from "@mui/material";

export type GeneralDividerProps = DividerProps;

function GeneralDivider(props: GeneralDividerProps) {
  return <Divider {...props} />;
}

export default GeneralDivider;
