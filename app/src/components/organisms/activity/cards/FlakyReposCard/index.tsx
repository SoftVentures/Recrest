import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { FlakyRepo } from "@/lib/activityAggregates";

interface Props {
  rows: FlakyRepo[];
  loading?: boolean;
}

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  columnGap: 8,
  rowGap: 4,
  alignItems: "baseline",
  fontSize: 12,
  color: theme.palette.text.primary,
}));

const Name = styled("span")({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: 600,
});

const Rate = styled("span")(({ theme }) => ({
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.information,
}));

const Bar = styled(Box)(({ theme }) => ({
  gridColumn: "1 / -1",
  height: 5,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
}));

const Fill = styled(Box, { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    width: `${width}%`,
    height: "100%",
    backgroundColor: theme.palette.error.main,
  }),
);

const Empty = styled("div")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "10px 0",
}));

function FlakyReposCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.cards.flaky_title", { defaultValue: "Flakiest repos" })}
      sub={t("activity.cards.flaky_sub", { defaultValue: "failure rate · last 14 days" })}
      loading={loading}
      skeleton="rows"
      testId="activity-flaky-card"
    >
      {rows.length === 0 ? (
        <Empty>{t("activity.cards.flaky_empty", { defaultValue: "No check-run data yet." })}</Empty>
      ) : (
        <List>
          {rows.map((r) => (
            <Row key={r.repoId}>
              <Name>{r.repoName}</Name>
              <Rate>{Math.round(r.failRate * 100)}%</Rate>
              <Bar>
                <Fill width={Math.max(3, r.failRate * 100)} />
              </Bar>
            </Row>
          ))}
        </List>
      )}
    </GeneralCard>
  );
}

export default FlakyReposCard;
