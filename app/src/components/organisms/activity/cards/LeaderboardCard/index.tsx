import { memo } from "react";

import { useTranslation } from "react-i18next";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import {
  Bar,
  BarFill,
  Body,
  Count,
  Empty,
  List,
  Name,
  Rank,
  Row,
  Spark,
  SparkBar,
  Top,
} from "@/components/organisms/activity/cards/LeaderboardCard/LeaderboardCard.styles";
import type { AuthorBucket } from "@/lib/activityStats";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  buckets: AuthorBucket[];
  windowDays?: number;
  loading?: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function LeaderboardCard({ buckets, windowDays = 14, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.leaders.title")}
      sub={t("activity.leaders.sub", { count: buckets.length, days: windowDays })}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.leaderboard}
    >
      {buckets.length === 0 ? (
        <Empty>{t("activity.leaders.empty")}</Empty>
      ) : (
        <List component="ol">
          {buckets.map((b, idx) => {
            const peakSpark = Math.max(1, ...b.sparkline);
            return (
              <Row key={b.author + (b.email ?? "")} component="li">
                <Rank component="span" variant="caption">
                  {MEDALS[idx] ?? idx + 1}
                </Rank>
                <AuthorAvatar name={b.author} email={b.email ?? undefined} size={22} />
                <Body>
                  <Top>
                    <Name component="span" variant="caption">
                      {b.author}
                    </Name>
                    <Count component="span" variant="caption">
                      {b.count} · {Math.round(b.share * 100)}%
                    </Count>
                  </Top>
                  <Bar>
                    <BarFill width={b.share * 100} />
                  </Bar>
                  <Spark>
                    {[...b.sparkline].reverse().map((v, i) => (
                      <SparkBar key={i} h={v / peakSpark} />
                    ))}
                  </Spark>
                </Body>
              </Row>
            );
          })}
        </List>
      )}
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-layout the chart rows.
export default memo(LeaderboardCard);
