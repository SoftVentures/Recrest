import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { colorForRepo } from "@/lib/activityStats";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

interface Props {
  quietestRepoIds: string[];
  reposById: Map<string, EnrichedRepo>;
}

const ChipRow = styled(Box)({
  display: "flex",
  flexWrap: "wrap",
  gap: pxToRem(4),
}) as typeof Box;

const Chip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(5),
  padding: pxToRems(2, 7, 2, 6),
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 100,
  fontSize: fontPxToRem(11),
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const Dot = styled("span", { shouldForwardProp: (p) => p !== "color" })<{ color: string }>(
  ({ color }) => ({
    width: pxToRem(7),
    height: pxToRem(7),
    borderRadius: "50%",
    backgroundColor: color,
    display: "inline-block",
  }),
);

const More = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  padding: pxToRems(2, 6),
})) as typeof Typography;

const Empty = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  padding: pxToRems(10, 0),
})) as typeof Box;

function QuietestReposCard({ quietestRepoIds, reposById }: Props) {
  const { t } = useTranslation();
  return (
    <GeneralCard
      title={t("activity.cadence.quietest")}
      testId={TEST_IDS.activity.cards.quietestRepos}
    >
      {quietestRepoIds.length === 0 ? (
        <Empty>{t("activity.cadence.quietest_none")}</Empty>
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
          {quietestRepoIds.length > 8 && (
            <More component="span" variant="caption">
              +{quietestRepoIds.length - 8}
            </More>
          )}
        </ChipRow>
      )}
    </GeneralCard>
  );
}

export default QuietestReposCard;
