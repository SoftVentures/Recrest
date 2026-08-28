import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { RefreshCw } from "lucide-react";

import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { opaqueSurfaceBg } from "@/lib/utils/translucency.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export const ProvidersGrid = styled(Box)({
  display: "grid",
  // The aside gives up width down to 200px before the repo list starts
  // shrinking, and `minmax(0, 1fr)` lets the list shrink past its own
  // min-content instead of pushing the modal wider than the viewport.
  gridTemplateColumns: `minmax(${pxToRem(200)}, ${pxToRem(280)}) minmax(0, 1fr)`,
  minWidth: 0,
  height: "100%",
}) as typeof Box;

export const ProvidersAside = styled(Box)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: pxToRem(10),
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
})) as typeof Box;

export const ProviderGroup = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
}) as typeof Box;

export const AsideHeading = styled(Typography)(({ theme }) => ({
  padding: pxToRems(6, 10),
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.information,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const AsideItem = styled("button", {
  shouldForwardProp: (p) => p !== "active" && p !== "depth",
})<{ active: boolean; depth?: number }>(({ theme, active, depth = 0 }) => {
  // Tree guide: a vertical line drops from the parent column for every nested
  // child so the eye can trace which subgroup belongs to which parent.
  const indentBase = 14;
  const leftPad = depth === 0 ? 10 : 10 + depth * indentBase;
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: pxToRem(8),
    width: "100%",
    textAlign: "left",
    padding:
      depth === 0
        ? pxToRems(7, 10)
        : `${pxToRem(5)} ${pxToRem(10)} ${pxToRem(5)} ${pxToRem(leftPad)}`,
    borderRadius: 8,
    border: 0,
    background: active
      ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
      : "transparent",
    color: active ? toneText(theme, StatusTone.PRIMARY) : theme.palette.text.primary,
    fontFamily: "inherit",
    fontSize: fontPxToRem(12.5),
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: active
        ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
        : theme.palette.surface.interface.active,
    },
    ...(depth > 0 && {
      "&::before": {
        content: '""',
        position: "absolute",
        left: pxToRem(10 + indentBase / 2),
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: theme.palette.divider,
      },
    }),
  };
});

export const AsideIcon = styled(Box)({
  width: pxToRem(18),
  height: pxToRem(18),
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}) as typeof Box;

export const ProvidersMain = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
}) as typeof Box;

export const SearchBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  padding: pxToRems(10, 16),
  borderBottom: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export const SelectedPill = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  padding: pxToRems(3, 9),
  borderRadius: 100,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: fontPxToRem(10.5),
  fontWeight: 700,
})) as typeof Typography;

export const RepoListScroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
}) as typeof Box;

export const SectionHeaderBar = styled(Box)(({ theme }) => ({
  position: "sticky",
  top: 0,
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  padding: pxToRems(8, 16),
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.information,
  // A sticky header must fully mask the rows scrolling beneath it, so it stays
  // opaque even in translucency mode (where the glassy modal body's
  // `background.default` is transparent and would bleed through as text-on-text).
  backgroundColor: opaqueSurfaceBg(theme),
  borderBottom: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- semantic <label> wraps a checkbox + clickable label area
export const RepoRow = styled("label", {
  shouldForwardProp: (p) => p !== "selected" && p !== "disabled",
})<{ selected: boolean; disabled?: boolean }>(({ theme, selected, disabled }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: pxToRem(12),
  padding: pxToRems(10, 16),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
  backgroundColor: selected
    ? `color-mix(in srgb, ${theme.palette.primary.main} 10%, transparent)`
    : "transparent",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: selected
      ? `color-mix(in srgb, ${theme.palette.primary.main} 12%, transparent)`
      : disabled
        ? "transparent"
        : theme.palette.surface.interface.active,
  },
  ...(selected
    ? {
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: theme.palette.primary.main,
        },
      }
    : {}),
}));

export const RepoBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const RepoTitleRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  minWidth: 0,
}) as typeof Box;

export const RepoTitle = styled(Typography)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  fontSize: fontPxToRem(13),
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

export const RepoDesc = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
  marginTop: pxToRem(2),
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const RepoMeta = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  marginTop: pxToRem(4),
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.informationLight,
})) as typeof Box;

export const RepoUpdatedColumn = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: pxToRem(2),
  flexShrink: 0,
  minWidth: pxToRem(88),
  paddingLeft: pxToRem(12),
  color: theme.palette.text.information,
  textAlign: "right",
})) as typeof Box;

export const RepoUpdatedRelative = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  fontWeight: 600,
  color: theme.palette.text.primary,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
})) as typeof Typography;

export const RepoUpdatedAbsolute = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(10),
  color: theme.palette.text.informationLight,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

export const LangChip = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
}) as typeof Box;

export const LangDot = styled(Typography)(({ theme }) => ({
  width: pxToRem(8),
  height: pxToRem(8),
  borderRadius: "50%",
  backgroundColor: theme.palette.primary.main,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const MetaBadge = styled("span", {
  shouldForwardProp: (p) => p !== "tone",
})<{ tone: "neutral" | "success" }>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(3),
  padding: pxToRems(1, 6),
  borderRadius: 8,
  fontSize: fontPxToRem(10),
  fontWeight: 600,
  backgroundColor:
    tone === "success"
      ? `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`
      : theme.palette.surface.interface.backElevation,
  color: tone === "success" ? theme.palette.success.main : theme.palette.text.information,
}));

export const EmptyState = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(8),
  padding: pxToRems(60, 20),
  textAlign: "center",
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
})) as typeof Box;

export const ConnectFirst = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: pxToRem(14),
  padding: pxToRem(60),
  textAlign: "center",
  height: "100%",
}) as typeof Box;

export const ConnectIcon = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: pxToRem(56),
  height: pxToRem(56),
  borderRadius: "50%",
  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 18%, transparent)`,
  color: theme.palette.primary.main,
})) as typeof Box;

export const ConnectBrands = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(14),
}) as typeof Box;

export const ConnectText = styled(Typography)(({ theme }) => ({
  maxWidth: pxToRem(360),
  fontSize: fontPxToRem(13),
  color: theme.palette.text.information,
})) as typeof Typography;

export const StatusInline = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
})) as typeof Typography;

export const Spin = styled(RefreshCw)({
  animation: "addrepo-spin 0.9s linear infinite",
  "@keyframes addrepo-spin": {
    to: { transform: "rotate(360deg)" },
  },
});

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const Badge = styled("span", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: pxToRem(16),
  minHeight: pxToRem(16),
  padding: pxToRems(0, 5),
  borderRadius: 100,
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  backgroundColor: active
    ? theme.palette.primary.main
    : theme.palette.surface.interface.backElevation,
  color: active ? theme.palette.primary.contrastText : theme.palette.text.information,
}));
