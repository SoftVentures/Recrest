import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { ChurnRow } from "@/lib/activityAggregates";
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
  ({ theme, width }) => ({
    height: "100%",
    width: `${width}%`,
    backgroundColor: theme.palette.success.main,
  }),
);

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Removed = styled("span", { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    height: "100%",
    width: `${width}%`,
    backgroundColor: theme.palette.warning.main,
  }),
);

const Empty = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "10px 0",
})) as typeof Box;

function ChurnCard({ rows, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...rows.map((r) => r.total));
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
            const widthPct = (r.total / peak) * 100;
            const addedPct = r.total === 0 ? 0 : (r.added / r.total) * widthPct;
            const removedPct = r.total === 0 ? 0 : (r.removed / r.total) * widthPct;
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
