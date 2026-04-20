import { useTranslation } from "react-i18next";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { MergeBucket } from "@/lib/activityAggregates";

interface Props {
  buckets: MergeBucket[];
  loading?: boolean;
}

const LABELS: Record<MergeBucket["bucket"], string> = {
  "<1h": "<1h",
  "<1d": "<1d",
  "<3d": "<3d",
  ">=3d": "≥3d",
};

export function TimeToMergeCard({ buckets, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <CardShell
      title={t("activity.cards.time_to_merge_title")}
      sub={t("activity.cards.time_to_merge_sub")}
      loading={loading}
      skeleton="rows"
    >
      <div className="a-act-hist">
        {buckets.map((b, i) => (
          <div key={b.bucket} className="a-act-hist-row">
            <span>{LABELS[b.bucket]}</span>
            <div className="a-act-hist-bar">
              <div
                className="a-act-hist-bar-fill a-act-anim-barh"
                style={{
                  width: `${(b.count / peak) * 100}%`,
                  animationDelay: `${320 + i * 80}ms`,
                }}
              />
            </div>
            <span className="a-act-hist-ct">{b.count}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
