import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ArrowDown, ArrowUp } from "lucide-react";

import type { WeekPair } from "@/lib/activityStats";

interface Props {
  commits: WeekPair;
  sparkline: number[];
}

const Root = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "12px 14px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  height: "100%",
}));

const Label = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
}));

const Value = styled("div")(({ theme }) => ({
  fontSize: 26,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.4px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.1,
}));

const Foot = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 6,
});

const Spark = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  gap: 3,
  height: 24,
  flex: 1,
});

const SparkBar = styled(Box, { shouldForwardProp: (p) => p !== "h" })<{ h: number }>(
  ({ theme, h }) => ({
    flex: 1,
    minHeight: 2,
    height: `${h}%`,
    borderRadius: 8,
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 55%, transparent)`,
  }),
);

const Delta = styled(Box, { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "up" | "down" | "flat";
}>(({ theme, tone }) => ({
  fontSize: 11,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontVariantNumeric: "tabular-nums",
  color:
    tone === "up"
      ? theme.palette.success.main
      : tone === "down"
        ? theme.palette.warning.main
        : theme.palette.text.information,
}));

function CommitsHero({ commits, sparkline }: Props) {
  const { t } = useTranslation();
  const dir: "up" | "down" | "flat" =
    commits.delta === 0 ? "flat" : commits.delta > 0 ? "up" : "down";
  const deltaLabel =
    commits.delta === 0
      ? t("activity.kpi.delta_flat", { defaultValue: "no change vs last week" })
      : commits.delta > 0
        ? t("activity.kpi.delta_up", {
            delta: commits.delta,
            defaultValue: `+${commits.delta} vs last week`,
          })
        : t("activity.kpi.delta_down", {
            delta: commits.delta,
            defaultValue: `${commits.delta} vs last week`,
          });
  const peak = Math.max(1, ...sparkline);
  // src-old: last 7 days reversed so today is on the right.
  const last7 = sparkline.slice(0, 7).reverse();
  return (
    <Root>
      <Label>{t("activity.kpi.commits_week", { defaultValue: "Commits · this week" })}</Label>
      <Value>{commits.current}</Value>
      <Foot>
        <Spark aria-hidden>
          {last7.map((v, i) => (
            <SparkBar key={i} h={Math.max(10, (v / peak) * 100)} />
          ))}
        </Spark>
        <Delta tone={dir}>
          {dir === "up" && <ArrowUp size={11} aria-hidden />}
          {dir === "down" && <ArrowDown size={11} aria-hidden />}
          <span>{deltaLabel}</span>
        </Delta>
      </Foot>
    </Root>
  );
}

export default CommitsHero;
