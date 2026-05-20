import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import { dayLabel } from "@/lib/activityStats";
import type { StackedDay } from "@/lib/activityStats";

interface Props {
  stacked: StackedDay[];
  total: number;
  loading?: boolean;
}

export function StackedChartCard({ stacked, total, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...stacked.map((d) => d.total));
  const reversed = [...stacked].reverse();
  return (
    <CardShell
      title={t("activity.cards.chart_title")}
      sub={t("activity.chart.sub", { total })}
      loading={loading}
      skeleton="bars"
    >
      <div className="a-act-chart" data-testid="activity-stacked-chart">
        {reversed.map((d) => (
          <ChartColumn key={d.day} day={d} peak={peak} />
        ))}
      </div>
      <div className="a-act-chart-axis">
        <span>14d ago</span>
        <span>7d</span>
        <span>today</span>
      </div>
    </CardShell>
  );
}

interface ChartColumnProps {
  day: StackedDay;
  peak: number;
}

function ChartColumn({ day, peak }: ChartColumnProps) {
  const [open, setOpen] = useState(false);
  const h = Math.max(4, (day.total / peak) * 100);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <div
        className="a-act-chart-col"
        data-testid="activity-stacked-col"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <TooltipTrigger asChild>
          {day.total === 0 ? (
            <div
              className="a-act-chart-bar a-act-chart-empty"
              style={{ height: `${h}%`, opacity: 0.25 }}
            />
          ) : (
            <div className="a-act-chart-stack" style={{ height: `${h}%` }}>
              {day.segments.map((s) => (
                <div
                  key={s.repoId}
                  className="a-act-chart-seg"
                  style={{ flex: s.count, background: s.color }}
                />
              ))}
            </div>
          )}
        </TooltipTrigger>
      </div>
      <TooltipContent side="top" sideOffset={8}>
        <div className="a-act-tt-title">
          {dayLabel(day.day)} · {day.total} {day.total === 1 ? "commit" : "commits"}
        </div>
        {day.segments.length > 0 && (
          <div className="a-act-tt-body">
            {day.segments.map((s) => (
              <div key={s.repoId} className="a-act-tt-row">
                <span className="a-act-tt-dot" style={{ background: s.color }} aria-hidden />
                <span className="a-act-tt-name">{s.repoName}</span>
                <span className="a-act-tt-num">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
