import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import type { ReviewQueueEntry } from "@/lib/activityAggregates";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { openExternal } from "@/lib/tauri";
import { StatusTone, toneChip } from "@/lib/utils/toneColor.utils";

interface Props {
  entries: ReviewQueueEntry[];
  loading?: boolean;
}

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const Item = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  padding: "6px 4px",
  background: "transparent",
  border: 0,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  color: "inherit",
  textAlign: "left",
  transition: "background 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
  flex: 1,
}) as typeof Box;

const Title = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Typography;

const Meta = styled(Typography)(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexWrap: "wrap",
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Age = styled("span", { shouldForwardProp: (p) => p !== "old" })<{ old?: boolean }>(
  ({ theme, old }) => ({
    fontSize: 11,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    padding: "1px 6px",
    borderRadius: 100,
    ...(old
      ? toneChip(theme, StatusTone.WARNING)
      : {
          backgroundColor: theme.palette.surface.interface.backElevation,
          color: theme.palette.text.secondary,
        }),
    flexShrink: 0,
  }),
);

const Empty = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "16px 0",
  textAlign: "center",
})) as typeof Box;

function ReviewQueueCard({ entries, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.cards.review_queue_title")}
      sub={t("activity.cards.review_queue_sub")}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.reviewQueue}
    >
      {entries.length === 0 ? (
        <Empty data-testid={TEST_IDS.activity.cards.reviewQueueEmpty}>
          {t("activity.cards.review_queue_empty")}
        </Empty>
      ) : (
        <List data-testid={TEST_IDS.activity.cards.reviewQueueList}>
          {entries.map((e) => {
            const age = Math.round(e.ageDays);
            const ageLabel =
              age === 1
                ? t("activity.cards.age_days_one", { count: age })
                : t("activity.cards.age_days_other", { count: age });
            const open = () => void openExternal(e.url);
            return (
              <Item key={`${e.repoId}#${e.number}`} type="button" onClick={open}>
                <Body component="span">
                  <Title component="span" variant="caption">
                    {e.title}
                  </Title>
                  <Meta component="span" variant="caption">
                    <Box component="span">{e.repoName}</Box>
                    <Box component="span">·</Box>
                    <Box component="span">#{e.number}</Box>
                    <Box component="span">·</Box>
                    <Box component="span">{e.author}</Box>
                  </Meta>
                </Body>
                <GeneralTooltip arrow placement="top" title={ageLabel}>
                  <Age old={age >= 7}>{age}d</Age>
                </GeneralTooltip>
              </Item>
            );
          })}
        </List>
      )}
    </GeneralCard>
  );
}

export default ReviewQueueCard;
