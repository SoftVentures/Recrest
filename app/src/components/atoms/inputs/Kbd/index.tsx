import type { HTMLAttributes, ReactNode } from "react";

import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

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
    minWidth: pxToRem(22),
    height: size === KbdSize.MD ? pxToRem(22) : pxToRem(18),
    padding: size === KbdSize.MD ? pxToRems(0, 6) : pxToRems(0, 5),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    color: size === KbdSize.MD ? theme.palette.text.primary : theme.palette.text.secondary,
    fontSize: size === KbdSize.MD ? fontPxToRem(10.5) : fontPxToRem(10),
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
