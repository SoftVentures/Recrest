import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import KpiCard from "@/components/molecules/cards/KpiCard";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";

export interface RepoStatsProps {
  repo: EnrichedRepo;
  /** Sum of all 14-day-bucket commits. */
  totalCommits: number;
  /** Tallest 14-day bucket (for the "peak" sub-line). */
  maxBucket: number;
  /** Open MRs (excluding drafts), or null when no provider is connected. */
  openMrsCount: number | null;
  /** Draft MRs (subset of open), or null when no provider is connected. */
  draftMrsCount: number | null;
}

const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
}) as typeof Box;

const Diff = styled(Box)({
  display: "inline-flex",
  alignItems: "baseline",
  gap: 6,
}) as typeof Box;

const Added = styled(Box)(({ theme }) => ({
  color: theme.palette.success.dark,
})) as typeof Box;

const Removed = styled(Box)(({ theme }) => ({
  color: theme.palette.error.dark,
})) as typeof Box;

/**
 * 4-up KPI grid that summarises a single repository's working-tree + activity
 * state. Replaces the inline `<KpiGrid>` previously inlined in RepoDetail; the
 * `openMrsCount === null` branch keeps the slot informative when no provider
 * is connected by showing the last-commit author instead.
 */
function RepoStats({ repo, totalCommits, maxBucket, openMrsCount, draftMrsCount }: RepoStatsProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const providerConnected = openMrsCount !== null && draftMrsCount !== null;

  return (
    <Grid data-testid={TEST_IDS.repoStats.root}>
      <KpiCard
        size="md"
        label={t("stats.ahead_behind")}
        value={`↑${repo.status.ahead} / ↓${repo.status.behind}`}
        sub={t("stats.ahead_behind_sub")}
        data-testid={TEST_IDS.repoStats.aheadBehind}
      />
      <KpiCard
        size="md"
        label={t("stats.changed_lines")}
        value={
          <Diff component="span">
            <Added component="span">+{repo.added}</Added>
            <Removed component="span">−{repo.removed}</Removed>
          </Diff>
        }
        sub={t("stats.changed_files", { count: repo.filesChanged })}
        data-testid={TEST_IDS.repoStats.changedLines}
      />
      <KpiCard
        size="md"
        label={t("stats.commits_14d")}
        value={totalCommits}
        sub={t("stats.commits_14d_sub", { count: maxBucket })}
        data-testid={TEST_IDS.repoStats.commits14d}
      />
      {providerConnected ? (
        <KpiCard
          size="md"
          label={t("stats.open_mrs")}
          value={openMrsCount}
          sub={t("stats.open_mrs_sub", { count: draftMrsCount })}
          data-testid={TEST_IDS.repoStats.openMrs}
        />
      ) : (
        <KpiCard
          size="md"
          label={t("stats.last_commit")}
          value="—"
          sub={repo.status.lastCommit?.author ?? t("stats.last_commit_empty")}
          data-testid={TEST_IDS.repoStats.lastCommit}
        />
      )}
    </Grid>
  );
}

export default RepoStats;
