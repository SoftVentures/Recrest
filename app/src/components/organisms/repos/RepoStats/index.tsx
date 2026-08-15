import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import KpiCard from "@/components/molecules/cards/KpiCard";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { pxToRem } from "@/theme/scale";

export interface RepoStatsProps {
  repo: EnrichedRepo;
  /** Sum of all commit buckets in the selected range. */
  totalCommits: number;
  /** Tallest bucket in the selected range (for the "peak" sub-line). */
  maxBucket: number;
  /** Days the selected global range spans — labels the commits KPI. */
  windowDays: number;
  /** Open MRs (excluding drafts), or null when no provider is connected. */
  openMrsCount: number | null;
  /** Draft MRs (subset of open), or null when no provider is connected. */
  draftMrsCount: number | null;
}

const Grid = styled(Box)({
  display: "grid",
  // Auto-fit so the 4 KPI cells collapse to 2 (or 1) on narrow viewports
  // instead of crushing labels like "OPEN MERGE REQUESTS" past readable width.
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: pxToRem(12),
}) as typeof Box;

const Diff = styled(Box)({
  display: "inline-flex",
  alignItems: "baseline",
  gap: pxToRem(6),
}) as typeof Box;

const Added = styled(Box)(({ theme }) => ({
  color: toneText(theme, StatusTone.SUCCESS),
})) as typeof Box;

const Removed = styled(Box)(({ theme }) => ({
  color: toneText(theme, StatusTone.ERROR),
})) as typeof Box;

/**
 * 4-up KPI grid that summarises a single repository's working-tree + activity
 * state. Replaces the inline `<KpiGrid>` previously inlined in RepoDetail; the
 * `openMrsCount === null` branch keeps the slot informative when no provider
 * is connected by showing the last-commit author instead.
 */
function RepoStats({
  repo,
  totalCommits,
  maxBucket,
  windowDays,
  openMrsCount,
  draftMrsCount,
}: RepoStatsProps) {
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
        label={t("stats.commits_14d", { days: windowDays })}
        value={totalCommits}
        sub={t("stats.commits_14d_sub", { peak: maxBucket })}
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
