import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { HeatmapMatrix } from "@/lib/activityAggregates";

interface Props {
  matrix: HeatmapMatrix;
  loading?: boolean;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export function HeatmapCard({ matrix, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...matrix.flat());
  return (
    <CardShell
      title={t("activity.cards.heatmap_title")}
      sub={t("activity.cards.heatmap_sub")}
      loading={loading}
      skeleton="heatmap"
    >
      <div className="a-act-heatmap" data-testid="activity-heatmap" role="img" aria-label="heatmap">
        {matrix.map((row, dayIdx) => (
          <div key={dayIdx} className="a-act-heatmap-row">
            <span className="a-act-heatmap-label" aria-hidden>
              {WEEKDAYS[dayIdx]}
            </span>
            {row.map((v, hourIdx) => {
              // Empty cells keep the base surface tone; every active cell
              // floors at 0.35 so a single commit is still visibly warmer
              // than an empty hour, even when `peak` is much larger.
              const intensity = v === 0 ? 0 : 0.35 + 0.65 * (v / peak);
              return (
                <Tooltip key={hourIdx}>
                  <TooltipTrigger asChild>
                    <div
                      className="a-act-heatmap-cell"
                      data-testid="activity-heatmap-cell"
                      style={{
                        ["--intensity" as string]: intensity,
                        ["--cell-delay" as string]: dayIdx * 24 + hourIdx,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {WEEKDAYS[dayIdx]} · {String(hourIdx).padStart(2, "0")}:00 · {v}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <div className="a-act-heatmap-foot" aria-hidden>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </CardShell>
  );
}
