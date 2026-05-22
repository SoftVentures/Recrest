import { useTranslation } from "react-i18next";

import { Box, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import { dayLabel } from "@/lib/activityStats";
import type { StackedDay } from "@/lib/activityStats";

interface Props {
  stacked: StackedDay[];
  total: number;
  loading?: boolean;
}

const Chart = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  gap: 4,
  height: 180,
});

const Column = styled(Box)({
  flex: 1,
  display: "flex",
  alignItems: "flex-end",
  height: "100%",
  minWidth: 0,
});

const Stack = styled(Box)({
  width: "100%",
  display: "flex",
  flexDirection: "column-reverse",
  borderRadius: "8px 8px 0 0",
  overflow: "hidden",
  minHeight: 0,
  transition: "filter 0.12s ease",
  "&:hover": {
    filter: "brightness(1.06) saturate(1.1)",
  },
});

const Seg = styled(Box, { shouldForwardProp: (p) => p !== "color" && p !== "flexValue" })<{
  color: string;
  flexValue: number;
}>(({ color, flexValue }) => ({
  width: "100%",
  flex: flexValue,
  minHeight: 2,
  backgroundColor: color,
}));

const EmptyCol = styled(Box)(({ theme }) => ({
  width: "100%",
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px dashed ${theme.palette.divider}`,
  borderBottom: 0,
  borderRadius: "8px 8px 0 0",
  opacity: 0.5,
}));

const Axis = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 4,
}));

const TooltipBody = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 2,
  minWidth: 140,
});

const TooltipTitle = styled("div")({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "-0.1px",
});

const TooltipRow = styled(Box)({
  display: "grid",
  gridTemplateColumns: "10px 1fr auto",
  alignItems: "center",
  gap: 6,
  fontSize: 10.5,
});

const TooltipDot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{
  color: string;
}>(({ color }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: color,
}));

function StackedChartCard({ stacked, total, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...stacked.map((d) => d.total));
  const reversed = [...stacked].reverse();
  return (
    <GeneralCard
      title={t("activity.cards.chart_title", { defaultValue: "Commit activity · 14 days" })}
      sub={t("activity.chart.sub", { total, defaultValue: `${total} commits` })}
      loading={loading}
      skeleton="bars"
      testId="activity-stacked-card"
    >
      <Chart data-testid="activity-stacked-chart">
        {reversed.map((d) => {
          const h = Math.max(4, (d.total / peak) * 100);
          const isEmpty = d.total === 0;
          const labelTotal = `${d.total} ${d.total === 1 ? "commit" : "commits"}`;
          return (
            <Tooltip
              key={d.day}
              arrow
              placement="top"
              title={
                <TooltipBody>
                  <TooltipTitle>
                    {dayLabel(d.day)} · {labelTotal}
                  </TooltipTitle>
                  {d.segments.map((s) => (
                    <TooltipRow key={s.repoId}>
                      <TooltipDot color={s.color} />
                      <span>{s.repoName}</span>
                      <span>{s.count}</span>
                    </TooltipRow>
                  ))}
                </TooltipBody>
              }
            >
              <Column data-testid="activity-stacked-col">
                {isEmpty ? (
                  <EmptyCol sx={{ height: `${h}%` }} />
                ) : (
                  <Stack sx={{ height: `${h}%` }}>
                    {d.segments.map((s) => (
                      <Seg key={s.repoId} color={s.color} flexValue={s.count} />
                    ))}
                  </Stack>
                )}
              </Column>
            </Tooltip>
          );
        })}
      </Chart>
      <Axis>
        <span>14d ago</span>
        <span>7d</span>
        <span>today</span>
      </Axis>
    </GeneralCard>
  );
}

export default StackedChartCard;
