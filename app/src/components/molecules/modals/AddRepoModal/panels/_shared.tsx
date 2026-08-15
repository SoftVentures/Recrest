import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { opaqueSurfaceBg } from "@/lib/utils/translucency.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SecondaryBtn = styled("button")(({ theme }) => ({
  minHeight: pxToRem(32),
  padding: pxToRems(0, 14),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 500,
  whiteSpace: "nowrap",
  flexShrink: 0,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrimaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  minHeight: pxToRem(32),
  padding: pxToRems(0, 14),
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 600,
  whiteSpace: "nowrap",
  flexShrink: 0,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": { backgroundColor: theme.palette.surface.button.ctaHover },
  "&:disabled": {
    opacity: 0.55,
    cursor: "not-allowed",
  },
}));

// Wrapping, not a single rigid row: the action row is authored for a 1200-px
// modal, but that width is capped at the viewport once `--ui-scale` grows past
// what the window can hold. Without the wrap the row simply overflows the
// paper's `overflow: hidden` and takes the Import button with it.
export const Footer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  minWidth: 0,
  gap: pxToRem(8),
  padding: pxToRems(12, 20, 16),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: opaqueSurfaceBg(theme),
  flexShrink: 0,
})) as typeof Box;

export const RememberToggle = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(8),
  marginRight: "auto",
  minWidth: 0,
}) as typeof Box;

export const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(4),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
export const Label = styled("label")(({ theme }) => ({
  fontSize: fontPxToRem(11),
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
}));

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
export const Input = styled("input")(({ theme }) => ({
  minHeight: pxToRem(36),
  minWidth: 0,
  padding: pxToRems(0, 12),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: fontPxToRem(13),
  outline: "none",
  transition: "border-color 0.12s ease, box-shadow 0.12s ease",
  "&:focus": {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${theme.palette.primary.main} 22%, transparent)`,
  },
  "&::placeholder": {
    color: theme.palette.text.information,
  },
}));

export const PathFieldRow = styled(Box)({
  display: "flex",
  alignItems: "stretch",
  gap: pxToRem(6),
  minWidth: 0,
  "& > input": { flex: 1, minWidth: 0 },
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const BrowseBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(6),
  minHeight: pxToRem(36),
  padding: pxToRems(0, 12),
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: fontPxToRem(12.5),
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&:disabled": { opacity: 0.55, cursor: "not-allowed" },
}));

export const Hint = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
export const FormBody = styled("form")({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

export const FormFields = styled(Box)({
  flex: 1,
  padding: pxToRems(20, 22),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(14),
  overflowY: "auto",
}) as typeof Box;
