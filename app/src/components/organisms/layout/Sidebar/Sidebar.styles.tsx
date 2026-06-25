import { NavLink } from "react-router-dom";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import Logo from "@/components/atoms/brand/Logo";

interface CollapsibleProps {
  collapsed: boolean;
}

interface ItemProps extends CollapsibleProps {
  active?: boolean;
  /** Force a visible border regardless of active state — used for the
   *  settings entry so it always reads as a chip in the footer. */
  forceBorder?: boolean;
}

const SHOULD_FORWARD = (prop: PropertyKey) =>
  prop !== "collapsed" && prop !== "active" && prop !== "isCount" && prop !== "forceBorder";

// Width + padding are animated via framer-motion's `useAnimate` hook, which
// targets the ref directly with a JS-driven RAF loop. This stays compatible
// with MUI's `styled()` theme context (wrapping the styled component in
// `motion.create(...)` breaks the emotion ThemeContext path).
// eslint-disable-next-line no-restricted-syntax -- semantic <aside> required for sidebar landmark
export const Aside = styled("aside")(({ theme }) => ({
  flexShrink: 0,
  alignSelf: "stretch",
  backgroundColor: theme.palette.surface.interface.navigation,
  borderRight: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
  paddingBottom: theme.spacing(1),
  minHeight: 0,
  // `position: relative` + `z-index: 1` lifts the Aside above the main content
  // area so the FoldButton (positioned absolutely with negative right offset)
  // is fully visible past Aside's right edge instead of being painted under
  // the sibling main-content's background.
  position: "relative",
  zIndex: 1,
  overflow: "visible",
  willChange: "width",
}));

export const BrandRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: theme.spacing(8),
  flexShrink: 0,
  gap: theme.spacing(1),
})) as typeof Box;

export const BrandLink = styled(NavLink)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1),
  textDecoration: "none",
  color: "inherit",
  padding: theme.spacing(0.5),
  borderRadius: 8,
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

export const BrandMark = styled(Logo, { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ collapsed }) => ({
    width: collapsed ? 32 : 40,
    height: collapsed ? 32 : 40,
    flexShrink: 0,
  }),
);

export const BrandName = styled(Typography)(({ theme }) => ({
  fontFamily: '"Space Grotesk", system-ui',
  fontSize: 17,
  fontWeight: 700,
  color: theme.palette.text.primary,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  lineHeight: 1,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- semantic <nav> required for navigation landmark
export const Nav = styled("nav", { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ collapsed }) => ({
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    alignItems: collapsed ? "center" : "stretch",
  }),
);

// Active items get the primary-tinted background AND a visible border. Inactive
// items keep a transparent 1px border purely to reserve layout space so the box
// doesn't shift when the active state toggles. `forceBorder` keeps the border
// visible regardless (used for the settings entry in the footer) — when the
// settings entry is *also* active we override the border with the primary
// colour so the selected state stays visible against the always-on chip
// border.
export const NavItem = styled(Box, { shouldForwardProp: SHOULD_FORWARD })<ItemProps>(({
  theme,
  collapsed,
  active,
  forceBorder,
}) => {
  // `surface.interface.active` is the canonical hover/active surface token
  // and stays distinct from the navigation bg across light and dark themes.
  const activeBg = theme.palette.surface.interface.active;
  const borderColor = active
    ? theme.palette.primary.main
    : forceBorder
      ? theme.palette.divider
      : "transparent";
  return {
    display: "flex",
    alignItems: "center",
    gap: 11,
    height: 38,
    padding: collapsed ? 0 : "0 11px",
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: 8,
    textDecoration: "none",
    color: theme.palette.text.primary,
    backgroundColor: active ? activeBg : "transparent",
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    fontFamily: "inherit",
    width: collapsed ? 38 : "100%",
    border: `1px solid ${borderColor}`,
    position: "relative",
    transition: "background 120ms, color 120ms, border-color 120ms",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: activeBg,
    },
  };
});

export const NavLabel = styled(Box)({
  flex: 1,
  fontSize: 14,
}) as typeof Box;

export const NavCount = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.secondary,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

export const NavDotCount = styled(Typography)(({ theme }) => ({
  position: "absolute",
  top: 1,
  right: 1,
  minWidth: 14,
  height: 14,
  padding: "0 3px",
  borderRadius: 8,
  fontSize: 9,
  fontWeight: 700,
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
})) as typeof Typography;

export const StyledNavLink = styled(NavLink)({
  textDecoration: "none",
  color: "inherit",
});

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const FoldButton = styled("button")(({ theme }) => ({
  position: "absolute",
  right: theme.spacing(-1.375),
  bottom: theme.spacing(17.5),
  width: theme.spacing(2.75),
  height: theme.spacing(2.75),
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(17, 17, 22, 0.06)",
  zIndex: 3,
  padding: 0,
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
    borderColor: theme.palette.border.hover,
  },
}));

export const Footer = styled(Box, { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ theme, collapsed }) => ({
    flex: "0 0 auto",
    marginLeft: collapsed ? theme.spacing(-0.5) : theme.spacing(-1),
    marginRight: collapsed ? theme.spacing(-0.5) : theme.spacing(-1),
    padding: collapsed ? theme.spacing(2, 0, 1.5) : theme.spacing(2, 1, 1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: collapsed ? "center" : "stretch",
    gap: theme.spacing(1.5),
    "& > a, & > div": {
      width: collapsed ? "auto" : "100%",
    },
  }),
);

export const RangeRow = styled(Box, { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ collapsed }) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: collapsed ? "auto" : "100%",
  }),
);
