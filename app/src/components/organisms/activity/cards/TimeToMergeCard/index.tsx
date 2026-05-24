import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { MergeBucket } from "@/lib/activityAggregates";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

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

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "36px 1fr 28px",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Box;

const RowLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 600,
})) as typeof Typography;

const Bar = styled(Box)(({ theme }) => ({
  height: 6,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
})) as typeof Box;

const Fill = styled(Box, { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    width: `${width}%`,
    height: "100%",
    backgroundColor: theme.palette.primary.main,
  }),
);

const Count = styled(Typography)(({ theme }) => ({
  textAlign: "right",
  color: theme.palette.text.primary,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

function TimeToMergeCard({ buckets, loading }: Props) {
  const { t } = useTranslation();
  const peak = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <GeneralCard
      title={t("activity.cards.time_to_merge_title")}
      sub={t("activity.cards.time_to_merge_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.timeToMerge}
    >
      <List>
        {buckets.map((b) => (
          <Row key={b.bucket}>
            <RowLabel component="span" variant="caption">
              {LABELS[b.bucket]}
            </RowLabel>
            <Bar>
              <Fill width={(b.count / peak) * 100} />
            </Bar>
            <Count component="span" variant="caption">
              {b.count}
            </Count>
          </Row>
        ))}
      </List>
    </GeneralCard>
  );
}

export default TimeToMergeCard;
