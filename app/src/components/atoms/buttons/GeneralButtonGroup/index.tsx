import { Children, cloneElement, isValidElement } from "react";

import { ToggleButton, ToggleButtonGroup, type ToggleButtonGroupProps } from "@mui/material";
import { styled } from "@mui/material/styles";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export type GeneralButtonGroupShape = "pill" | "square";
export type GeneralButtonGroupSize = "md" | "sm" | "xs";

export interface GeneralButtonGroupProps extends ToggleButtonGroupProps {
  shape?: GeneralButtonGroupShape;
  /**
   * `md` (default): 38px buttons — header / page toolbars.
   * `sm`: 32px buttons — popovers, scope rows.
   * `xs`: 30px buttons — page toolbars that sit next to `FilterButton` etc.
   */
  density?: GeneralButtonGroupSize;
}

const HEIGHT_BY_DENSITY: Record<GeneralButtonGroupSize, number> = {
  md: 38,
  sm: 32,
  xs: 30,
};

const PADDING_BY_DENSITY: Record<GeneralButtonGroupSize, string> = {
  md: pxToRems(0, 14),
  sm: pxToRems(0, 12),
  xs: pxToRems(0, 10),
};

interface StyledProps {
  shape?: GeneralButtonGroupShape;
  density?: GeneralButtonGroupSize;
}

const SHOULD_FORWARD = (prop: PropertyKey) => prop !== "shape" && prop !== "density";

/**
 * Segmented button group with **one continuous border** around the whole
 * tile and 1px vertical dividers between adjacent segments. The active
 * segment is signalled only by a subtle background fill — the outer border
 * stays the same colour regardless of selection so the tile reads as one
 * coherent control, not "buttons next to each other".
 *
 * Works with any number of segments (2, 5, 6, …). Adjacent segments share
 * a single 1px divider via a `border-left` on every segment except the
 * first. The outer border is owned by the group element so segment
 * borders never appear at the outer edge.
 */
const StyledGroup = styled(ToggleButtonGroup, { shouldForwardProp: SHOULD_FORWARD })<StyledProps>(
  ({ theme, shape = "square", density = "md" }) => ({
    display: "inline-flex",
    alignItems: "stretch",
    gap: 0,
    height: pxToRem(HEIGHT_BY_DENSITY[density]),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: shape === "square" ? 8 : 999,
    padding: 0,
    fontFamily: "inherit",
    flexWrap: "nowrap",
    overflow: "hidden",
    transition: "border-color 150ms ease",
    "&:hover": {
      borderColor: theme.palette.border.hover,
    },
    "&.MuiToggleButtonGroup-vertical": {
      flexDirection: "column",
      height: "auto",
      width: pxToRem(HEIGHT_BY_DENSITY[density]),
    },
  }),
);

const StyledToggle = styled(ToggleButton, { shouldForwardProp: SHOULD_FORWARD })<StyledProps>(
  ({ theme, density = "md" }) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: pxToRem(6),
    height: "100%",
    padding: PADDING_BY_DENSITY[density],
    // No outer borders — those belong to the group. Only a 1px left
    // divider between adjacent siblings to mark segment boundaries.
    border: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    color: theme.palette.text.secondary,
    fontFamily: "inherit",
    fontSize: fontPxToRem(12),
    fontWeight: 500,
    lineHeight: 1,
    cursor: "pointer",
    whiteSpace: "nowrap",
    textTransform: "none",
    transition: "color 150ms ease, background-color 150ms ease",

    // Horizontal group: 1px left divider on every segment except the first.
    ".MuiToggleButtonGroup-horizontal &:not(:first-of-type)": {
      borderLeft: `1px solid ${theme.palette.divider}`,
    },
    // Vertical group: 1px top divider on every segment except the first.
    ".MuiToggleButtonGroup-vertical &:not(:first-of-type)": {
      borderTop: `1px solid ${theme.palette.divider}`,
    },

    "&:hover": {
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.surface.interface.active,
    },
    "&.Mui-selected": {
      // Active = subtle fill only. No border-colour change, no font-weight
      // jump — the tile still reads as one continuous control.
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.surface.interface.active,
    },
    "&.Mui-selected:hover": {
      backgroundColor: theme.palette.surface.interface.active,
    },
    "&.Mui-disabled": {
      opacity: 0.45,
      cursor: "default",
    },
  }),
);

function GeneralButtonGroup({
  shape = "square",
  density = "md",
  children,
  ...rest
}: GeneralButtonGroupProps) {
  const decorated = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child as React.ReactElement<StyledProps>, {
      shape: (child.props as StyledProps).shape ?? shape,
      density: (child.props as StyledProps).density ?? density,
    });
  });

  return (
    <StyledGroup shape={shape} density={density} {...rest}>
      {decorated}
    </StyledGroup>
  );
}

export { StyledToggle as GeneralButtonGroupItem };
export default GeneralButtonGroup;
