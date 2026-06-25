import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { ChurnRow } from "@/lib/activityAggregates";
import { DIFF_ADDED, DIFF_REMOVED } from "@/lib/charts/palette";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface Props {
  rows: ChurnRow[];
  loading?: boolean;
}

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

const Row = styled(Box)({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  rowGap: 4,
  columnGap: 8,
  alignItems: "baseline",
}) as typeof Box;

const Name = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

const Nums = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

const Bar = styled(Box)(({ theme }) => ({
  gridColumn: "1 / -1",
  display: "flex",
  height: 5,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Added = styled("span", { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ width }) => ({
    height: "100%",
    width: `${width}%`,
    backgroundColor: DIFF_ADDED,
  }),
);

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Removed = styled("span", { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ width }) => ({
    height: "100%",
    width: `${width}%`,
    backgroundColor: DIFF_REMOVED,
  }),
);

const Empty = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "10px 0",
})) as typeof Box;

function ChurnCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.cards.churn_title")}
      sub={t("activity.cards.churn_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.churn}
    >
      {rows.length === 0 ? (
        <Empty>—</Empty>
      ) : (
        <List>
          {rows.map((r) => {
            // The bar always fills 100% and splits added/removed by share — the
            // composition stays legible even for low-churn repos. Cross-repo
            // magnitude is conveyed by the row order (sorted by total churn,
            // busiest first) and the exact +added −removed counts beside it.
            const addedPct = r.total === 0 ? 0 : (r.added / r.total) * 100;
            const removedPct = r.total === 0 ? 0 : (r.removed / r.total) * 100;
            return (
              <Row key={r.repoId}>
                <Name component="span" variant="caption">
                  {r.repoName}
                </Name>
                <Nums component="span" variant="caption">
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
