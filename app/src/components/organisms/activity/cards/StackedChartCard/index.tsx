import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import {
  Axis,
  Chart,
  Column,
  EmptyCol,
  Seg,
  Stack,
  TooltipBody,
  TooltipDot,
  TooltipRow,
  TooltipTitle,
} from "@/components/organisms/activity/cards/StackedChartCard/StackedChartCard.styles";
import { dayLabel } from "@/lib/activityStats";
import type { StackedDay } from "@/lib/activityStats";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  stacked: StackedDay[];
  total: number;
  loading?: boolean;
}

function StackedChartCard({ stacked, total, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...stacked.map((d) => d.total));
  const reversed = [...stacked].reverse();
  return (
    <GeneralCard
      title={t("activity.cards.chart_title")}
      sub={t("activity.chart.sub", { total })}
      loading={loading}
      skeleton="bars"
      testId={TEST_IDS.activity.stacked.card}
    >
      <Chart data-testid={TEST_IDS.activity.stacked.chart}>
        {reversed.map((d) => {
          const h = Math.max(4, (d.total / peak) * 100);
          const isEmpty = d.total === 0;
          const labelTotal = `${d.total} ${d.total === 1 ? "commit" : "commits"}`;
          return (
            <GeneralTooltip
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
                      <Box component="span">{s.repoName}</Box>
                      <Box component="span">{s.count}</Box>
                    </TooltipRow>
                  ))}
                </TooltipBody>
              }
            >
              <Column data-testid={TEST_IDS.activity.stacked.col}>
                {isEmpty ? (
                  <EmptyCol style={{ height: `${h}%` }} />
                ) : (
                  <Stack style={{ height: `${h}%` }}>
                    {d.segments.map((s) => (
                      <Seg key={s.repoId} color={s.color} flexValue={s.count} />
                    ))}
                  </Stack>
                )}
              </Column>
            </GeneralTooltip>
          );
        })}
      </Chart>
      <Axis>
        <Box component="span">14d ago</Box>
        <Box component="span">7d</Box>
        <Box component="span">today</Box>
      </Axis>
    </GeneralCard>
  );
}

export default StackedChartCard;
