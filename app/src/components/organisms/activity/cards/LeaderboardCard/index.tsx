import { useTranslation } from "react-i18next";

import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import type { AuthorBucket } from "@/lib/activityStats";

interface Props {
  buckets: AuthorBucket[];
  loading?: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function MiniSpark({ values }: { values: number[] }) {
  const peak = Math.max(1, ...values);
  return (
    <div className="a-act-lb-spark" aria-hidden>
      {[...values].reverse().map((v, i) => (
        <span
          key={i}
          className="a-act-lb-spark-bar"
          style={{ height: `${Math.max(8, (v / peak) * 100)}%`, opacity: v === 0 ? 0.2 : 1 }}
        />
      ))}
    </div>
  );
}

export function LeaderboardCard({ buckets, loading }: Props) {
  const { t } = useTranslation();
  return (
    <CardShell
      title={t("activity.leaders.title")}
      sub={t("activity.leaders.sub", { count: buckets.length })}
      loading={loading}
      skeleton="rows"
    >
      {buckets.length === 0 ? (
        <div className="a-act-card-empty">{t("activity.leaders.empty")}</div>
      ) : (
        <ol className="a-act-lb">
          {buckets.map((b, idx) => (
            <li key={b.author} className="a-act-lb-row">
              <span className="a-act-lb-rank">{MEDALS[idx] ?? idx + 1}</span>
              <AuthorAvatar name={b.author} email={b.email} size={22} />
              <div className="a-act-lb-body">
                <div className="a-act-lb-top">
                  <span className="a-act-lb-name">{b.author}</span>
                  <span className="a-act-lb-count">
                    {b.count} · {Math.round(b.share * 100)}%
                  </span>
                </div>
                <div className="a-act-lb-bar">
                  <div
                    className="a-act-lb-bar-fill a-act-anim-barh"
                    style={{
                      width: `${Math.max(4, b.share * 100)}%`,
                      animationDelay: `${300 + idx * 80}ms`,
                    }}
                  />
                </div>
                <MiniSpark values={b.sparkline} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </CardShell>
  );
}
