import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/molecules/cards/GeneralCard";
import { colorForRepo } from "@/lib/activityStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";

interface Props {
  quietestRepoIds: string[];
  reposById: Map<string, EnrichedRepo>;
}

const ChipRow = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
});

const Chip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "2px 7px 2px 6px",
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 100,
  fontSize: 11,
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

const Dot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{ color: string }>(
  ({ color }) => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: color,
    display: "inline-block",
  }),
);

const More = styled("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  padding: "2px 6px",
}));

const Empty = styled("div")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "10px 0",
}));

function QuietestReposCard({ quietestRepoIds, reposById }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.cadence.quietest", { defaultValue: "Quietest repos" })}
      testId="activity-quietest-card"
    >
      {quietestRepoIds.length === 0 ? (
        <Empty>
          {t("activity.cadence.quietest_none", { defaultValue: "Every repo has activity." })}
        </Empty>
      ) : (
        <ChipRow>
          {quietestRepoIds.slice(0, 8).map((id) => {
            const r = reposById.get(id);
            return (
              <Chip key={id}>
                <Dot color={colorForRepo(id)} />
                {r?.name ?? id}
              </Chip>
            );
          })}
          {quietestRepoIds.length > 8 && <More>+{quietestRepoIds.length - 8}</More>}
        </ChipRow>
      )}
    </GeneralCard>
  );
}

export default QuietestReposCard;
