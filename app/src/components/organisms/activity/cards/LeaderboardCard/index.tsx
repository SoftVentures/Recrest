import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralAuthorAvatar from "@/components/molecules/avatars/GeneralAuthorAvatar";
import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { AuthorBucket } from "@/lib/activityStats";

interface Props {
  buckets: AuthorBucket[];
  loading?: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

const List = styled("ol")({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

const Row = styled("li")({
  display: "grid",
  gridTemplateColumns: "22px 22px 1fr",
  gap: 10,
  alignItems: "center",
});

const Rank = styled("span")(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  color: theme.palette.text.information,
  textAlign: "right",
}));

const Body = styled(Box)({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

const Top = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
  fontSize: 12,
});

const Name = styled("span")(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const Count = styled("span")(({ theme }) => ({
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
}));

const Bar = styled(Box)(({ theme }) => ({
  height: 5,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
}));

const BarFill = styled(Box, { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    height: "100%",
    width: `${Math.max(4, width)}%`,
    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, color-mix(in srgb, ${theme.palette.primary.main} 55%, white))`,
    borderRadius: 8,
    transition: "width 0.2s ease",
  }),
);

const Spark = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(14, 1fr)",
  gap: 2,
  height: 18,
  alignItems: "end",
  marginTop: 2,
});

const SparkBar = styled(Box, { shouldForwardProp: (p) => p !== "h" })<{ h: number }>(
  ({ theme, h }) => ({
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 45%, transparent)`,
    borderRadius: 8,
    minHeight: 2,
    height: `${Math.max(8, h * 100)}%`,
    opacity: h === 0 ? 0.2 : 1,
  }),
);

const Empty = styled("div")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "10px 0",
}));

function LeaderboardCard({ buckets, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.leaders.title", { defaultValue: "Top contributors" })}
      sub={t("activity.leaders.sub", {
        count: buckets.length,
        defaultValue: `last 14 days · ${buckets.length} authors`,
      })}
      loading={loading}
      skeleton="rows"
      testId="activity-leaderboard-card"
    >
      {buckets.length === 0 ? (
        <Empty>{t("activity.leaders.empty", { defaultValue: "No contributors in range." })}</Empty>
      ) : (
        <List>
          {buckets.map((b, idx) => {
            const peakSpark = Math.max(1, ...b.sparkline);
            return (
              <Row key={b.author + (b.email ?? "")}>
                <Rank>{MEDALS[idx] ?? idx + 1}</Rank>
                <GeneralAuthorAvatar name={b.author} email={b.email ?? undefined} size={22} />
                <Body>
                  <Top>
                    <Name>{b.author}</Name>
                    <Count>
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

export default LeaderboardCard;
