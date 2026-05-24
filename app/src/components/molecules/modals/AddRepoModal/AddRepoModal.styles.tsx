import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Header = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const HeaderIcon = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 8,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  flexShrink: 0,
})) as typeof Box;

export const HeaderText = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
  flex: 1,
  paddingTop: 4,
}) as typeof Box;

export const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  fontWeight: 700,
  lineHeight: "24px",
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
})) as typeof Typography;

export const HeaderSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 12.5,
  lineHeight: "18px",
  color: theme.palette.text.information,
})) as typeof Typography;

export const HeaderBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

export const TitleText = styled(Typography)(({ theme }) => ({
  fontSize: 15,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
})) as typeof Typography;

export const SubText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  marginTop: 2,
})) as typeof Typography;

export const TabBar = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 4,
  padding: "10px 20px 0",
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
export const TabButton = styled("button", {
  shouldForwardProp: (p) => p !== "active",
})<{ active: boolean }>(({ theme, active }) => ({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 12px",
  background: "transparent",
  border: 0,
  marginBottom: -1,
  color: active ? theme.palette.text.primary : theme.palette.text.information,
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "color 0.12s ease",
  "&:hover": {
    color: theme.palette.text.primary,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: active ? theme.palette.primary.main : "transparent",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
export const Badge = styled("span", {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 5px",
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  backgroundColor: active
    ? theme.palette.primary.main
    : theme.palette.surface.interface.backElevation,
  color: active ? theme.palette.primary.contrastText : theme.palette.text.information,
}));

export const Body = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
}) as typeof Box;
