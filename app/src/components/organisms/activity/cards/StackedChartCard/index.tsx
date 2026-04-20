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
        {reversed.map((d) => {
          const h = Math.max(4, (d.total / peak) * 100);
          return (
            <Tooltip key={d.day}>
              <TooltipTrigger asChild>
                <div className="a-act-chart-col" data-testid="activity-stacked-col">
                  {d.total === 0 ? (
                    <div
                      className="a-act-chart-bar a-act-chart-empty"
                      style={{ height: `${h}%`, opacity: 0.25 }}
                    />
                  ) : (
                    <div className="a-act-chart-stack" style={{ height: `${h}%` }}>
                      {d.segments.map((s) => (
                        <div
                          key={s.repoId}
                          className="a-act-chart-seg"
                          style={{ flex: s.count, background: s.color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="a-act-tt-title">
                  {dayLabel(d.day)} · {d.total} {d.total === 1 ? "commit" : "commits"}
                </div>
                {d.segments.length > 0 && (
                  <div className="a-act-tt-body">
                    {d.segments.map((s) => (
                      <div key={s.repoId} className="a-act-tt-row">
                        <span
                          className="a-act-tt-dot"
                          style={{ background: s.color }}
                          aria-hidden
                        />
                        <span className="a-act-tt-name">{s.repoName}</span>
                        <span className="a-act-tt-num">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="a-act-chart-axis">
        <span>14d ago</span>
        <span>7d</span>
        <span>today</span>
      </div>
    </CardShell>
  );
}
