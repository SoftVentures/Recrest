import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { MONO_STACK } from "@/lib/utils/appearance.utils";

export const Pane = styled(Box)(({ theme }) => ({
  width: 360,
  flexShrink: 0,
  borderLeft: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  "@media (max-width: 1180px)": {
    width: 320,
  },
})) as typeof Box;

export const Header = styled(Box)({
  padding: "16px 16px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
}) as typeof Box;

export const HeaderTopRow = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
}) as typeof Box;

export const HeaderTitleStack = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const RepoName = styled(Box)(({ theme }) => ({
  fontSize: 17,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.3px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const RepoPath = styled(Box)(({ theme }) => ({
  marginTop: 3,
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const LangPill = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginTop: 6,
  fontSize: 11,
  color: theme.palette.text.secondary,
})) as typeof Typography;

export const LangDot = styled(Typography)(({ theme }) => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  backgroundColor: theme.palette.primary.main,
})) as typeof Typography;

export const IconRow = styled(Box)({
  display: "flex",
  gap: 5,
  alignItems: "center",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrimaryIde = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  flex: 1,
  minWidth: 0,
  height: 30,
  padding: "0 10px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
}));

export const BranchCard = styled(Box)(({ theme }) => ({
  margin: "0 16px 14px",
  padding: "12px 14px",
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.background.default
      : theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  gap: 10,
})) as typeof Box;

export const BranchTop = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
}) as typeof Box;

export const BranchQuick = styled(Box)({
  display: "flex",
  gap: 5,
}) as typeof Box;

export const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 500,
  fontFamily: MONO_STACK,
  color: theme.palette.text.primary,
  maxWidth: 200,
  minWidth: 0,
})) as typeof Box;

export const BranchText = styled(Box)({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const GhostBtn = styled("button")(({ theme }) => ({
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  height: 26,
  padding: "0 8px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: "inherit",
  fontSize: 11.5,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

export const Section = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
})) as typeof Box;

export const SectionHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  gap: 8,
}) as typeof Box;

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.secondary,
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const SectionAction = styled("button")(({ theme }) => ({
  background: "transparent",
  border: 0,
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 600,
  color: theme.palette.primary.main,
  cursor: "pointer",
  padding: 0,
  "&:hover": { textDecoration: "underline" },
}));

export const Count = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 500,
  color: theme.palette.text.information,
})) as typeof Typography;

export const SectionBody = styled(Box)({
  padding: "0 16px 14px",
}) as typeof Box;

export const SectionEmpty = styled(Box)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.informationLight,
  fontStyle: "italic",
})) as typeof Box;

export const CommitsList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

export const CommitItem = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
}) as typeof Box;

export const CommitAvatar = styled(Box)(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: "50%",
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.primary,
  fontSize: 11,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginTop: 1,
})) as typeof Box;

export const CommitText = styled(Box)({ flex: 1, minWidth: 0 }) as typeof Box;

export const CommitSubject = styled(Box)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 500,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

export const CommitMeta = styled(Box)(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 2,
  display: "flex",
  gap: 5,
  alignItems: "center",
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

export const CommitSha = styled(Typography)(({ theme }) => ({
  fontFamily: MONO_STACK,
  color: theme.palette.text.secondary,
})) as typeof Typography;

export const PrList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const PrItem = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
  cursor: "pointer",
  textAlign: "left",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

export const PrTitle = styled(Box)({
  flex: 1,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}) as typeof Box;

export const PrMeta = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Typography;

export const Footer = styled(Box)(({ theme }) => ({
  marginTop: "auto",
  flex: "0 0 auto",
  padding: "12px 16px 16px",
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const FullView = styled("button")(({ theme }) => ({
  width: "100%",
  height: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
  },
}));
