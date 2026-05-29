import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Body = styled(Box)(({ theme }) => ({
  width: 320,
  display: "flex",
  flexDirection: "column",
  padding: 12,
  gap: 10,
  backgroundColor: theme.palette.background.paper,
})) as typeof Box;

export const HeaderRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
}) as typeof Box;

export const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 700,
  color: theme.palette.text.primary,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button> for the inline ghost "Reset" affordance; keyboard-focusable without nesting issues
export const ResetBtn = styled("button")(({ theme }) => ({
  border: 0,
  background: "transparent",
  color: theme.palette.text.information,
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  padding: "2px 4px",
  borderRadius: 4,
  "&:hover": { color: theme.palette.text.primary },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
  "&:disabled": {
    color: theme.palette.text.disabled,
    cursor: "default",
  },
}));

export const Section = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  paddingTop: 6,
  borderTop: `1px solid ${theme.palette.divider}`,
  "&:first-of-type": {
    borderTop: "none",
    paddingTop: 0,
  },
})) as typeof Box;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: theme.palette.text.informationLight,
  marginBottom: 2,
})) as typeof Typography;

export const OptionList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: 168,
  overflowY: "auto",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required for the keyboard-focusable filter option rows (toggle-style)
export const Option = styled("button", {
  shouldForwardProp: (p) => p !== "selected",
})<{ selected: boolean }>(({ theme, selected }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 6px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: theme.palette.text.primary,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  textAlign: "left",
  "&:hover": {
    background: theme.palette.surface.interface.active,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,
  },
  ...(selected && {
    color: theme.palette.text.primary,
    fontWeight: 600,
  }),
}));

// eslint-disable-next-line no-restricted-syntax -- styled('span') required: must be a phrasing element (legal inside the row's <button>) and carries a custom typed `checked` prop, so Box's `component="span"` overload won't compose with the variant API cleanly
export const CheckBox = styled("span", {
  shouldForwardProp: (p) => p !== "checked",
})<{ checked: boolean }>(({ theme, checked }) => ({
  width: 14,
  height: 14,
  borderRadius: 4,
  border: `1px solid ${checked ? theme.palette.primary.main : theme.palette.divider}`,
  background: checked ? theme.palette.primary.main : theme.palette.background.default,
  color: theme.palette.primary.contrastText ?? "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}));

export const OptionLabel = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}) as typeof Box;

export const OptionMeta = styled(Typography)(({ theme }) => ({
  flexShrink: 0,
  color: theme.palette.text.informationLight,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

export const EmptyHint = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
  padding: "4px 6px",
})) as typeof Typography;

export const ActiveBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 5px",
  borderRadius: 8,
  marginLeft: 2,
  fontSize: 10,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText ?? "#fff",
})) as typeof Box;
