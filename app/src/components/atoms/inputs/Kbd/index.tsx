import type { HTMLAttributes, ReactNode } from "react";

import { styled } from "@mui/material/styles";

export const KbdSize = {
  /** Compact 18px tall — used inside chrome (header search hint, search panel). */
  SM: "sm",
  /** 22px tall — used in the shortcuts list where the keys are the focal element. */
  MD: "md",
} as const;

export type KbdSize = (typeof KbdSize)[keyof typeof KbdSize];

export interface KbdProps extends Omit<HTMLAttributes<HTMLElement>, "size"> {
  size?: KbdSize;
  children?: ReactNode;
}

// eslint-disable-next-line no-restricted-syntax -- semantic <kbd> element; this primitive exists to render keyboard input markup
const Root = styled("kbd", { shouldForwardProp: (p) => p !== "size" })<{ size: KbdSize }>(
  ({ theme, size }) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    height: size === KbdSize.MD ? 22 : 18,
    padding: size === KbdSize.MD ? "0 6px" : "0 5px",
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    color: size === KbdSize.MD ? theme.palette.text.primary : theme.palette.text.secondary,
    fontSize: size === KbdSize.MD ? 10.5 : 10,
    fontFamily: "inherit",
    fontWeight: 600,
  }),
);

function Kbd({ size = KbdSize.SM, children, ...rest }: KbdProps) {
  return (
    <Root size={size} {...rest}>
      {children}
    </Root>
  );
}

export default Kbd;
