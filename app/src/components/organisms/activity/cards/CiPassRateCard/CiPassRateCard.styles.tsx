import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const Chart = styled(Box)({
  display: "grid",
  gridTemplateColumns: "28px 1fr",
  gap: 6,
  alignItems: "stretch",
}) as typeof Box;

export const Axis = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
  textAlign: "right",
  padding: "8px 0",
})) as typeof Box;

export const Plot = styled(Box)({
  width: "100%",
}) as typeof Box;

export const Svg = styled("svg")({
  width: "100%",
  height: 140,
});

export const AxisLine = styled("line")(({ theme }) => ({
  stroke: theme.palette.divider,
  strokeWidth: 1,
}));

export const Series = styled("path")({
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const Fill = styled("path")({
  fillOpacity: 0.18,
});

export const Headline = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  "& > strong": {
    fontSize: 22,
    fontWeight: 700,
    color: theme.palette.success.main,
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
  shouldForwardProp: (p) => p !== "width" && p !== "tone",
})<{
  width: number;
  tone: "ok" | "warn" | "fail";
}>(({ theme, width, tone }) => ({
  width: `${width}%`,
  height: "100%",
  backgroundColor:
    tone === "ok"
      ? theme.palette.success.main
      : tone === "warn"
        ? theme.palette.warning.main
        : theme.palette.error.main,
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
