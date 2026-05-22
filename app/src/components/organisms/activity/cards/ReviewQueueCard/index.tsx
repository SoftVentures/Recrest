import { useTranslation } from "react-i18next";

import { Box, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import type { ReviewQueueEntry } from "@/lib/activityAggregates";
import { openExternal } from "@/lib/tauri";

interface Props {
  entries: ReviewQueueEntry[];
  loading?: boolean;
}

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

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

const Body = styled("span")({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
  flex: 1,
});

const Title = styled("span")(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const Meta = styled("span")(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexWrap: "wrap",
}));

const Age = styled("span", { shouldForwardProp: (p) => p !== "old" })<{ old?: boolean }>(
  ({ theme, old }) => ({
    fontSize: 11,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    padding: "1px 6px",
    borderRadius: 100,
    backgroundColor: old
      ? `color-mix(in srgb, ${theme.palette.warning.main} 18%, transparent)`
      : theme.palette.surface.interface.backElevation,
    color: old ? theme.palette.warning.dark : theme.palette.text.secondary,
    flexShrink: 0,
  }),
);

const Empty = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "16px 0",
  textAlign: "center",
}));

function ReviewQueueCard({ entries, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.cards.review_queue_title", { defaultValue: "Review queue" })}
      sub={t("activity.cards.review_queue_sub", { defaultValue: "oldest open MRs" })}
      loading={loading}
      skeleton="rows"
      testId="activity-review-queue-card"
    >
      {entries.length === 0 ? (
        <Empty data-testid="activity-card-review-queue-empty">
          {t("activity.cards.review_queue_empty", { defaultValue: "No open MRs waiting." })}
        </Empty>
      ) : (
        <List data-testid="activity-card-review-queue-list">
          {entries.map((e) => {
            const age = Math.round(e.ageDays);
            const ageLabel =
              age === 1
                ? t("activity.cards.age_days_one", { count: age, defaultValue: `${age} day old` })
                : t("activity.cards.age_days_other", {
                    count: age,
                    defaultValue: `${age} days old`,
                  });
            const open = () => void openExternal(e.url);
            return (
              <Item key={`${e.repoId}#${e.number}`} type="button" onClick={open}>
                <Body>
                  <Title>{e.title}</Title>
                  <Meta>
                    <span>{e.repoName}</span>
                    <span>·</span>
                    <span>#{e.number}</span>
                    <span>·</span>
                    <span>{e.author}</span>
                  </Meta>
                </Body>
                <Tooltip arrow placement="top" title={ageLabel}>
                  <Age old={age >= 7}>{age}d</Age>
                </Tooltip>
              </Item>
            );
          })}
        </List>
      )}
    </GeneralCard>
  );
}

export default ReviewQueueCard;
