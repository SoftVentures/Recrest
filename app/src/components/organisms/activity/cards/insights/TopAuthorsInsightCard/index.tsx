import { memo } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { TopAuthor } from "@/lib/insights";

interface Props {
  authors: TopAuthor[];
  periodDays: number;
  loading?: boolean;
}

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

const Row = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
});

const Name = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const Count = styled(Box)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 700,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
}));

const Empty = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
}));

function TopAuthorsInsightCard({ authors, periodDays, loading }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.insights.top_authors_title")}
      sub={t("activity.insights.top_authors_sub", { days: periodDays })}
      loading={loading}
      skeleton="rows"
      testId={TEST_IDS.activity.cards.insights.topAuthors}
    >
      {authors.length === 0 ? (
        <Empty>{t("activity.insights.empty")}</Empty>
      ) : (
        <List>
          {authors.map((a) => (
            <Row key={a.author + (a.email ?? "")}>
              <AuthorAvatar name={a.author} email={a.email ?? undefined} size={22} />
              <Name>{a.author}</Name>
              <Count>{a.count}</Count>
            </Row>
          ))}
        </List>
      )}
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-render this card.
export default memo(TopAuthorsInsightCard);
