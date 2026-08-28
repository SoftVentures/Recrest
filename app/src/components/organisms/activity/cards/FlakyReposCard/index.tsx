import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import type { FlakyRepo } from "@/lib/activityAggregates";
import { barGradient } from "@/lib/charts/palette";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

interface Props {
  rows: FlakyRepo[];
  windowDays?: number;
  loading?: boolean;
}

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(8),
}) as typeof Box;

const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  columnGap: pxToRem(8),
  rowGap: pxToRem(4),
  alignItems: "baseline",
  fontSize: fontPxToRem(12),
  color: theme.palette.text.primary,
})) as typeof Box;

const Name = styled(Typography)({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: 600,
}) as typeof Typography;

const Rate = styled(Typography)(({ theme }) => ({
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.information,
})) as typeof Typography;

const Bar = styled(Box)(({ theme }) => ({
  gridColumn: "1 / -1",
  height: pxToRem(5),
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
  overflow: "hidden",
})) as typeof Box;

const Fill = styled(Box, { shouldForwardProp: (p) => p !== "width" })<{ width: number }>(
  ({ theme, width }) => ({
    width: `${width}%`,
    height: "100%",
    backgroundImage: barGradient(theme.palette.primary.main),
  }),
);

const Empty = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  padding: pxToRems(10, 0),
})) as typeof Box;

function FlakyReposCard({ rows, windowDays = 14, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.cards.flaky_title")}
      sub={t("activity.cards.flaky_sub", { days: windowDays })}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.flakyRepos}
    >
      {rows.length === 0 ? (
        <Empty>{t("activity.cards.flaky_empty")}</Empty>
      ) : (
        <List>
          {rows.map((r) => (
            <Row key={r.repoId}>
              <Name component="span" variant="caption">
                {r.repoName}
              </Name>
              <Rate component="span" variant="caption">
                {Math.round(r.failRate * 100)}%
              </Rate>
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
