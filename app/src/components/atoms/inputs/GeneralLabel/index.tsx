import { forwardRef } from "react";

import { FormLabel, type FormLabelProps } from "@mui/material";

export type GeneralLabelProps = FormLabelProps;

const GeneralLabel = forwardRef<HTMLLabelElement, GeneralLabelProps>(
  function GeneralLabel(props, ref) {
    return <FormLabel ref={ref} {...props} />;
  },
);

export default GeneralLabel;
