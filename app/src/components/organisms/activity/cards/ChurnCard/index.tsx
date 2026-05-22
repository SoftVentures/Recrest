import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { ChurnRow } from "@/lib/activityAggregates";

interface Props {
  rows: ChurnRow[];
  loading?: boolean;
}

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const Row = styled(Box)({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  rowGap: 4,
  columnGap: 8,
  alignItems: "baseline",
});

const Name = styled("span")(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const Nums = styled("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

const Bar = styled(Box)(({ theme }) => ({
  gridColumn: "1 / -1",
  display: "flex",
  height: 5,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
}));

const Added = styled("span", { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    height: "100%",
    width: `${width}%`,
    backgroundColor: theme.palette.success.main,
  }),
);

const Removed = styled("span", { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    height: "100%",
    width: `${width}%`,
    backgroundColor: theme.palette.warning.main,
  }),
);

const Empty = styled("div")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "10px 0",
}));

function ChurnCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...rows.map((r) => r.total));
  return (
    <GeneralCard
      title={t("activity.cards.churn_title", { defaultValue: "Churn · working tree" })}
      sub={t("activity.cards.churn_sub", { defaultValue: "added + removed lines" })}
      loading={loading}
      skeleton="rows"
      testId="activity-churn-card"
    >
      {rows.length === 0 ? (
        <Empty>—</Empty>
      ) : (
        <List>
          {rows.map((r) => {
            const widthPct = (r.total / peak) * 100;
            const addedPct = r.total === 0 ? 0 : (r.added / r.total) * widthPct;
            const removedPct = r.total === 0 ? 0 : (r.removed / r.total) * widthPct;
            return (
              <Row key={r.repoId}>
                <Name>{r.repoName}</Name>
                <Nums>
                  +{r.added} −{r.removed}
                </Nums>
                <Bar>
                  <Added width={addedPct} />
                  <Removed width={removedPct} />
                </Bar>
              </Row>
            );
          })}
        </List>
      )}
    </GeneralCard>
  );
}

export default ChurnCard;
