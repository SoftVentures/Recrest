import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

import { styled } from "@mui/material/styles";

import { pxToRem, pxToRems } from "@/theme/scale";

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility / focusable / keyboard support
const Root = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  padding: pxToRems(6, 8),
  borderRadius: 8,
  cursor: "pointer",
  background: "transparent",
  border: 0,
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

export interface ClickableRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  children: ReactNode;
}

/**
 * Hover-highlighted row that behaves like a clickable list item — the canonical
 * "tap a thing in a card" surface used across Dashboard, Activity, etc.
 */
const ClickableRow = forwardRef<HTMLButtonElement, ClickableRowProps>(
  function ClickableRow(props, ref) {
    return <Root ref={ref} type="button" {...props} />;
  },
);

export default ClickableRow;
