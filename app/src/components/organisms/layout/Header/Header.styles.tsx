import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import KbdAtom from "@/components/atoms/inputs/Kbd";
import { CSS_VAR_APP_HEADER_HEIGHT, fontPxToRem, mediaDown, pxToRem } from "@/theme/scale";

/** One full rotation of the refresh glyph. Shared so the min-spin guard in the
 *  Header can require a whole number of rotations before showing the result. */
export const HEADER_REFRESH_SPIN_MS = 900;

export const TopBar = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  // 64 px matches the original mocks where the header is the primary visual
  // anchor of the app shell; the taller bar also gives the 38-px buttons
  // room to breathe. Read from the CSS var (4rem) rather than hard-coded, so
  // `--recrest-app-chrome-bottom` and this element can never disagree.
  height: `var(${CSS_VAR_APP_HEADER_HEIGHT})`,
  paddingLeft: pxToRem(24),
  // Pages reserve a scrollbar gutter via `scrollbar-gutter: stable`; the
  // header doesn't scroll, so without compensation its right edge would sit
  // 17 px past the page content on platforms with classic scrollbars. The
  // var is set once at mount by `useScrollbarWidth`; falls back to 0 on
  // overlay-scrollbar platforms (macOS default) so nothing shifts there.
  paddingRight: `calc(${pxToRem(24)} + var(--recrest-scrollbar-width, 0px))`,
  gap: pxToRem(16),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "relative",
  zIndex: 5,
})) as typeof Box;

export const LeftSection = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "nowrap",
  gap: pxToRem(10),
  minWidth: 0,
  flex: "0 1 auto",
}) as typeof Box;

export const Title = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(24),
  lineHeight: 30 / 24,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.4px",
  margin: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
  fontFamily: "inherit",
})) as typeof Typography;

export const Meta = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.secondary,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  flex: "0 0 auto",
  [mediaDown(721, theme.uiScale)]: { display: "none" },
})) as typeof Box;

export const CenterSection = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flex: "1 1 auto",
  minWidth: 0,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SearchTrigger = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  height: pxToRem(38),
  width: "100%",
  minWidth: "8rem",
  maxWidth: pxToRem(480),
  flex: "1 1 auto",
  paddingLeft: pxToRem(12),
  paddingRight: pxToRem(12),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    borderColor: theme.palette.border.hover,
  },
}));

export const SearchPlaceholder = styled(Typography)(({ theme }) => ({
  flex: "1 1 auto",
  minWidth: 0,
  fontSize: fontPxToRem(13),
  color: theme.palette.text.secondary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
})) as typeof Typography;

export const Kbd = styled(KbdAtom)(({ theme }) => ({
  [mediaDown(1024, theme.uiScale)]: { display: "none" },
}));

export const RightSection = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: pxToRem(6),
  flex: "0 0 auto",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const AddRepoButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(8),
  minHeight: pxToRem(38),
  paddingLeft: pxToRem(14),
  paddingRight: pxToRem(14),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  flexShrink: 0,
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
    borderColor: theme.palette.border.hover,
  },
}));

export const AddRepoLabel = styled(Box)(({ theme }) => ({
  [mediaDown(961, theme.uiScale)]: { display: "none" },
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const RefreshButton = styled("button", { shouldForwardProp: (p) => p !== "spinning" })<{
  spinning?: boolean;
}>(({ theme, spinning }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: pxToRem(38),
  height: pxToRem(38),
  padding: 0,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  flexShrink: 0,
  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
    color: theme.palette.text.primary,
  },
  "&:disabled": {
    opacity: 0.6,
    cursor: "default",
  },
  "& svg": {
    transition: "transform 0.2s ease",
    ...(spinning && {
      animation: `headerRefreshSpin ${HEADER_REFRESH_SPIN_MS}ms linear infinite`,
    }),
  },
  "@keyframes headerRefreshSpin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
}));
