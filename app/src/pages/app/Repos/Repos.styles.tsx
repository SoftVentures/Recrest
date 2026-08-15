import { Box, Divider, Menu, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";

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
  gap: 12,
  // The view toggle and the filter button drop onto a second line rather than
  // overflowing the page when the layout width (or the UI scale) squeezes them.
  flexWrap: "wrap",
  rowGap: 8,
  // Right padding compensates for the page-scroll gutter so the toolbar's
  // right edge lines up with the table inside the scroll surface.
  padding: "12px 24px",
  paddingRight: "calc(24px + var(--recrest-scrollbar-width, 0px))",
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const FilterButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 30,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 12,
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
  minWidth: 16,
  height: 16,
  padding: "0 5px",
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.background.default,
  marginLeft: 2,
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
  paddingBottom: 24,
}) as typeof Box;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
  padding: "6px 12px 4px",
})) as typeof Typography;

export const FilterMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    width: 240,
    marginTop: theme.spacing(0.5),
  },
}));

export const MenuSeparator = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
  marginBottom: theme.spacing(0.5),
}));
