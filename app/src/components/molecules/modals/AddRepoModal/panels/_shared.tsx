import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { opaqueSurfaceBg } from "@/lib/utils/translucency.utils";

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SecondaryBtn = styled("button")(({ theme }) => ({
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrimaryBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": { backgroundColor: theme.palette.surface.button.ctaHover },
  "&:disabled": {
    opacity: 0.55,
    cursor: "not-allowed",
  },
}));

export const Footer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 20px 16px",
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: opaqueSurfaceBg(theme),
  flexShrink: 0,
})) as typeof Box;

export const RememberToggle = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginRight: "auto",
}) as typeof Box;

export const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
export const Label = styled("label")(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
}));

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
export const Input = styled("input")(({ theme }) => ({
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 13,
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
  gap: 6,
  minWidth: 0,
  "& > input": { flex: 1, minWidth: 0 },
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const BrowseBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 12.5,
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
  fontSize: 11,
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
  padding: "20px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  overflowY: "auto",
}) as typeof Box;
