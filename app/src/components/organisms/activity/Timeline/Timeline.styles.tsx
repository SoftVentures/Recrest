import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Pills = styled(ToggleButtonGroup)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 999,
  padding: 3,
  gap: 2,
  "& .MuiToggleButtonGroup-grouped": {
    border: 0,
    margin: 0,
    "&:not(:first-of-type)": { marginLeft: 0, borderLeft: 0 },
  },
}));

export const Pill = styled(ToggleButton)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 24,
  padding: "0 10px",
  border: 0,
  background: "transparent",
  color: theme.palette.text.secondary,
  fontFamily: "inherit",
  fontSize: 11.5,
  fontWeight: 500,
  borderRadius: 999,
  textTransform: "none",
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: "rgba(17, 17, 22, 0.05)",
  },
  "&.Mui-selected": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.surface.interface.base,
    boxShadow: `0 0 0 1px ${theme.palette.border.default}, 0 1px 2px rgba(0, 0, 0, 0.06)`,
  },
  "&.Mui-selected:hover": {
    backgroundColor: theme.palette.surface.interface.base,
  },
}));

export const PillCount = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 14,
  padding: "0 4px",
  borderRadius: 999,
  fontSize: 9.5,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.information,
  ".Mui-selected &": {
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    color: theme.palette.primary.dark,
  },
})) as typeof Box;

export const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
}) as typeof Box;

export const DayCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
})) as typeof Box;

export const DayHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
}) as typeof Box;

export const DayTitle = styled(Box)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.primary,
})) as typeof Box;

export const ChipRow = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const Chip = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "neutral" | "ok" | "info" | "err";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 10,
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: 100,
  ...(tone === "ok" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.success.main} 16%, transparent)`,
    color: theme.palette.success.dark,
  }),
  ...(tone === "info" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    color: theme.palette.primary.dark,
  }),
  ...(tone === "err" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.error.main} 16%, transparent)`,
    color: theme.palette.error.dark,
  }),
  ...(tone === "neutral" && {
    backgroundColor: theme.palette.surface.interface.base,
    color: theme.palette.text.secondary,
  }),
}));

export const Feed = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
})) as typeof Box;

export const Empty = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "16px 0",
  textAlign: "center",
})) as typeof Box;

export const ShowMore = styled(Box)({
  display: "flex",
  justifyContent: "center",
  paddingTop: 4,
}) as typeof Box;
