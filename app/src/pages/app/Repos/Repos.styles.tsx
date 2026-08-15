import { Box, Divider, Menu, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

// `containerType` lets DetailPane's width ladder query the *layout* width:
// `#root` carries `zoom: var(--ui-scale)`, and a `@media` px threshold reports
// the unscaled viewport, so it fires at the wrong moment on scaled setups.
export const PageRoot = styled(Box)({
  display: "flex",
  height: "100%",
  minHeight: 0,
  containerType: "inline-size",
}) as typeof Box;

export const MainColumn = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

export const ToolbarRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: pxToRem(12),
  // The view toggle and the filter button drop onto a second line rather than
  // overflowing the page when the layout width (or the UI scale) squeezes them.
  flexWrap: "wrap",
  rowGap: pxToRem(8),
  // Right padding compensates for the page-scroll gutter so the toolbar's
  // right edge lines up with the table inside the scroll surface.
  padding: pxToRems(12, 24),
  paddingRight: `calc(${pxToRem(24)} + var(--recrest-scrollbar-width, 0px))`,
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const FilterButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  minHeight: pxToRem(30),
  padding: pxToRems(0, 10),
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: fontPxToRem(12),
  fontWeight: 500,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&[data-active='true']": {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  },
}));

export const FilterBadge = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: pxToRem(16),
  minHeight: pxToRem(16),
  padding: pxToRems(0, 5),
  borderRadius: 100,
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.background.default,
  marginLeft: pxToRem(2),
})) as typeof Typography;

export const ListScroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  // Reserve scrollbar gutter so width is identical whether the page
  // currently overflows or not — keeps page-swap horizontally stable.
  scrollbarGutter: "stable",
  // Breathing room below the table/cards so the last row doesn't butt against
  // the viewport edge when scrolled to the bottom.
  paddingBottom: pxToRem(24),
}) as typeof Box;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
  padding: pxToRems(6, 12, 4),
})) as typeof Typography;

export const FilterMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    width: pxToRem(240),
    marginTop: theme.spacing(0.5),
  },
}));

export const MenuSeparator = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
  marginBottom: theme.spacing(0.5),
}));
