import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { barGradient } from "@/lib/charts/palette";

export const ChartWrap = styled(Box)({
  width: "100%",
  height: 140,
}) as typeof Box;

export const Headline = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  "& > strong": {
    fontSize: 22,
    fontWeight: 700,
    color: theme.palette.primary.main,
    letterSpacing: "-0.4px",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
  },
  "& > span": {
    fontSize: 10,
    color: theme.palette.text.information,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
    marginTop: 2,
  },
})) as typeof Box;

export const Breakdown = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  marginTop: 6,
}) as typeof Box;

export const RepoRow = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(60px, 100px) 32px 36px",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Box;

export const RepoName = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

export const RepoBar = styled(Box)(({ theme }) => ({
  height: 5,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
})) as typeof Box;

export const RepoBarFill = styled(Box, {
  shouldForwardProp: (p) => p !== "width",
})<{
  width: number;
}>(({ theme, width }) => ({
  width: `${width}%`,
  height: "100%",
  backgroundImage: barGradient(theme.palette.primary.main),
}));

export const RepoPct = styled(Typography)(({ theme }) => ({
  textAlign: "right",
  color: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
})) as typeof Typography;

export const RepoRuns = styled(Typography)(({ theme }) => ({
  textAlign: "right",
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;
