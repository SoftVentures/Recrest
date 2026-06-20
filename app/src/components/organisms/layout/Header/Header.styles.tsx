import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import KbdAtom from "@/components/atoms/inputs/Kbd";

/** One full rotation of the refresh glyph. Shared so the min-spin guard in the
 *  Header can require a whole number of rotations before showing the result. */
export const HEADER_REFRESH_SPIN_MS = 900;

export const TopBar = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  // 64 px matches the original mocks where the header is the primary visual
  // anchor of the app shell; the taller bar also gives the 38-px buttons
  // room to breathe.
  height: 64,
  paddingLeft: 24,
  // Pages reserve a scrollbar gutter via `scrollbar-gutter: stable`; the
  // header doesn't scroll, so without compensation its right edge would sit
  // 17 px past the page content on platforms with classic scrollbars. The
  // var is set once at mount by `useScrollbarWidth`; falls back to 0 on
  // overlay-scrollbar platforms (macOS default) so nothing shifts there.
  paddingRight: "calc(24px + var(--recrest-scrollbar-width, 0px))",
  gap: 16,
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "relative",
  zIndex: 5,
})) as typeof Box;

export const LeftSection = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "nowrap",
  gap: 10,
  minWidth: 0,
  flex: "0 1 auto",
}) as typeof Box;

export const Title = styled(Typography)(({ theme }) => ({
  fontSize: 24,
  lineHeight: "30px",
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
  fontSize: 11.5,
  color: theme.palette.text.secondary,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  flex: "0 0 auto",
  [theme.breakpoints.down(721)]: { display: "none" },
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
  gap: 8,
  height: 38,
  width: "100%",
  minWidth: "8rem",
  maxWidth: 480,
  flex: "1 1 auto",
  paddingLeft: 12,
  paddingRight: 12,
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
  fontSize: 13,
  color: theme.palette.text.secondary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
})) as typeof Typography;

export const Kbd = styled(KbdAtom)(({ theme }) => ({
  [theme.breakpoints.down(1024)]: { display: "none" },
}));

export const RightSection = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  flex: "0 0 auto",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const AddRepoButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 38,
  paddingLeft: 14,
  paddingRight: 14,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  flexShrink: 0,
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
    borderColor: theme.palette.border.hover,
  },
}));

export const AddRepoLabel = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down(961)]: { display: "none" },
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const FindAcrossButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
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
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const RefreshButton = styled("button", { shouldForwardProp: (p) => p !== "spinning" })<{
  spinning?: boolean;
}>(({ theme, spinning }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
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
