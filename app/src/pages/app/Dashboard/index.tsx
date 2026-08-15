import { useMemo } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, PrState, RepoStatusChip } from "@recrest/shared";

import { FolderGit2, GitBranch as MrIcon } from "lucide-react";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import AheadBehind from "@/components/atoms/git/AheadBehind";
import StaggeredReveal from "@/components/atoms/transitions/StaggeredReveal";
import KpiCard from "@/components/molecules/cards/KpiCard";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import ClickableRow from "@/components/molecules/rows/ClickableRow";
import HeatmapCard from "@/components/organisms/activity/cards/HeatmapCard";
import LanguageDonutCard from "@/components/organisms/activity/cards/LanguageDonutCard";
import { useRangeActivity } from "@/hooks/useActivityCommits";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { computeHeatmap, computeLanguageMix } from "@/lib/activityAggregates";
import {
  PAGE_DUR_MD,
  PAGE_EASE,
  pgRise,
  pgZoom,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { ciFor } from "@/lib/constants/ciStates.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import ActivityChart from "@/pages/app/Dashboard/parts/ActivityChart";
import AttentionRow from "@/pages/app/Dashboard/parts/AttentionRow";
import CiDot from "@/pages/app/Dashboard/parts/CiDot";
import QuickActionsCard from "@/pages/app/Dashboard/parts/QuickActionsCard";
import {
  ActivityBarsSkeleton,
  CardBlockSkeleton,
  CommitListSkeleton,
  KpiSkeleton,
} from "@/pages/app/Dashboard/parts/skeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/reducers/uiReducer";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

// `containerType` so the two grids below can step down on the *layout* width:
// `#root` carries `zoom: var(--ui-scale)`, and a `@media` px threshold reports
// the unscaled viewport, so it fires at the wrong moment on scaled setups.
const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
  padding: pxToRems(16, 24),
  backgroundColor: theme.palette.background.default,
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  scrollbarGutter: "stable",
  containerType: "inline-size",
})) as typeof Box;

// `minmax(0, 1fr)`, not a bare `1fr`: `1fr` is `minmax(auto, 1fr)`, so a KPI
// with a long number or a long German label would push the track past its share
// and overflow the page. Four tiles across stop being readable well before the
// window does, so they fold to two rows first.
const Kpis = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: pxToRem(12),
  animation: `${pgZoom} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
  [`@container (max-width: ${pxToRem(900)})`]: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  ...prefersReducedMotionGuard,
}) as typeof Box;

// Same `minmax(0, …)` reasoning; the sidebar column collapses under the main
// column once 1/3 of the width can no longer hold a card.
const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  gridAutoRows: "min-content",
  gap: pxToRem(12),
  [`@container (max-width: ${pxToRem(860)})`]: {
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  "& > *": {
    animation: `${pgRise} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
    animationDelay: "220ms",
  },
  "& > *:nth-of-type(2)": { animationDelay: "280ms" },
  "& > *:nth-of-type(3)": { animationDelay: "340ms" },
  "& > *:nth-of-type(4)": { animationDelay: "400ms" },
  "& > *:nth-of-type(5)": { animationDelay: "460ms" },
  "& > *:nth-of-type(6)": { animationDelay: "520ms" },
  "& > *:nth-of-type(n + 7)": { animationDelay: "580ms" },
  ...prefersReducedMotionGuard,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const CtaLink = styled("button")(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.primary.main,
  cursor: "pointer",
  background: "transparent",
  border: 0,
  padding: 0,
  fontFamily: "inherit",
  "&:hover": { textDecoration: "underline" },
}));

const AttnList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(2),
}) as typeof Box;

const RowBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const RowPrimary = styled(Box)(({ theme }) => ({
  fontSize: fontPxToRem(12.5),
  fontWeight: 500,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

const RowSecondary = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: pxToRem(6),
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.information,
  marginTop: pxToRem(2),
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

const Sep = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
})) as typeof Typography;

const FullSpanCard = styled(GeneralCard)({ gridColumn: "1 / -1" });

const AttentionMeta = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11.5),
  color: theme.palette.text.information,
})) as typeof Typography;

const MrList = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 0,
}) as typeof Box;

function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const reposLoading = useAppSelector((s) => s.repos.loading);
  const prsItems = useAppSelector((s) => s.prs.items);
  const prs = Object.values(prsItems).flat();
  const connections = useAppSelector((s) => s.providers.connections);
  const anyProviderConnected = Object.values(connections).some((c) => c?.connected);

  const dirtyRepos = repos.filter((r) => r.status.dirty);
  const behindRepos = repos.filter((r) => r.status.behind > 0);
  const openPRs = prs.filter((p) => p.state === PrState.OPEN);

  const totalAhead = repos.reduce((s, r) => s + r.status.ahead, 0);
  const totalBehind = repos.reduce((s, r) => s + r.status.behind, 0);

  // Everything here follows the global selected range (sidebar dropdown) — no
  // fixed 14-day window. `aggregate` is the all-repos activity series bucketed
  // adaptively (day/week/month) for the window; `recentCommits` is the same
  // range stream the Activity page uses, so the heatmap/languages/recent-list
  // all move with the range too.
  const {
    commits: recentCommits,
    loading: commitsLoading,
    aggregate: agg,
    unit: activityUnit,
    windowDays: activityWindowDays,
  } = useRangeActivity();
  const totalCommits = agg.reduce((s, v) => s + v, 0);
  const maxDay = Math.max(...agg, 1);
  const recent = useMemo(() => {
    const byRepo = new Map(repos.map((r) => [r.id, r] as const));
    return recentCommits.slice(0, 6).map((c) => ({ ...c, repo: byRepo.get(c.repoId) }));
  }, [recentCommits, repos]);
  const commitsInitialLoad = commitsLoading && recent.length === 0;

  const heatmapToday = useMemo(() => new Date(), []);
  const heatmap = useMemo(
    () => computeHeatmap(recentCommits, heatmapToday, activityWindowDays),
    [recentCommits, heatmapToday, activityWindowDays],
  );

  const reposById = useMemo(() => {
    const m = new Map<string, EnrichedRepo>();
    for (const r of repos) m.set(r.id, r);
    return m;
  }, [repos]);
  const languageMix = useMemo(
    () => computeLanguageMix(recentCommits, reposById),
    [recentCommits, reposById],
  );

  const cleanReposCount = repos.filter((r) => r.clean).length;

  const goto = (repoId: string, path = AppRoute.REPOS) => {
    dispatch(setSelectedRepo(repoId));
    navigate(path);
  };

  if (reposLoading && repos.length === 0) {
    return (
      <Root data-testid={TEST_IDS.dashboard.page} aria-busy>
        <Kpis>
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </Kpis>
        <Grid>
          <FullSpanCard title={t("dash.activity.title", { days: activityWindowDays })}>
            <ActivityBarsSkeleton />
          </FullSpanCard>
          <CardBlockSkeleton rows={3} />
          {anyProviderConnected && <CardBlockSkeleton rows={4} />}
          <CardBlockSkeleton rows={5} />
          <CardBlockSkeleton rows={3} />
          <CardBlockSkeleton rows={3} />
          <CardBlockSkeleton rows={3} />
        </Grid>
      </Root>
    );
  }

  const isEmptyOnboarding = !reposLoading && repos.length === 0;

  if (isEmptyOnboarding) {
    return (
      <Root data-testid={TEST_IDS.dashboard.page}>
        <GeneralCard>
          <EmptyState
            icon={FolderGit2}
            title={t("dash.empty.title")}
            description={t("dash.empty.hint")}
            action={
              <CtaLink type="button" onClick={() => navigate(AppRoute.REPOS)}>
                {t("dash.empty.cta")}
              </CtaLink>
            }
          />
        </GeneralCard>
      </Root>
    );
  }

  return (
    <Root
      data-testid={TEST_IDS.dashboard.page}
      tabIndex={0}
      aria-label={t("dashboard.main", { ns: I18nNamespace.ARIA })}
    >
      <StaggeredReveal component={Kpis} step={50} maxDelay={200}>
        <KpiCard
          label={t("dash.kpi.repositories")}
          value={repos.length}
          sub={t("dash.kpi.repositories_sub", { count: dirtyRepos.length })}
          onClick={() => navigate(AppRoute.REPOS)}
        />
        {anyProviderConnected ? (
          <KpiCard
            label={t("dash.kpi.merge_requests")}
            value={openPRs.length}
            sub={t("dash.kpi.merge_requests_sub", { count: prs.filter((p) => p.draft).length })}
            accent
            onClick={() => navigate(AppRoute.MERGE_REQUESTS)}
          />
        ) : (
          <KpiCard
            label={t("dash.kpi.clean_repos")}
            value={cleanReposCount}
            sub={t("dash.kpi.clean_repos_sub", {
              clean: cleanReposCount,
              total: repos.length,
            })}
            onClick={() => navigate(AppRoute.REPOS)}
          />
        )}
        <KpiCard
          label={t("dash.kpi.ahead_behind")}
          value={<AheadBehind ahead={totalAhead} behind={totalBehind} variant="separated" />}
          sub={t("dash.kpi.ahead_behind_sub")}
          onClick={() => navigate(AppRoute.BRANCHES)}
        />
        <KpiCard
          label={t("dash.kpi.commits", { days: activityWindowDays })}
          value={totalCommits}
          sub={t("dash.kpi.commits_sub", { peak: maxDay })}
          onClick={() => navigate(AppRoute.ACTIVITY)}
        />
      </StaggeredReveal>

      <Grid>
        <ActivityChart
          agg={agg}
          maxDay={maxDay}
          unit={activityUnit}
          title={t("dash.activity.title", { days: activityWindowDays })}
          meta={t("dash.activity.meta", { total: totalCommits, repos: repos.length })}
        />

        <GeneralCard
          title={t("dash.attention.title")}
          right={
            <AttentionMeta variant="caption">
              {t("dash.attention.count", {
                count: Math.min(dirtyRepos.length, 3) + Math.min(behindRepos.length, 2),
              })}
            </AttentionMeta>
          }
        >
          <AttnList>
            {dirtyRepos.slice(0, 3).map((r) => (
              <AttentionRow
                key={r.id}
                repo={r}
                kind={RepoStatusChip.DIRTY}
                onClick={() => goto(r.id)}
              />
            ))}
            {behindRepos.slice(0, 2).map((r) => (
              <AttentionRow
                key={r.id + "-b"}
                repo={r}
                kind={RepoStatusChip.BEHIND}
                onClick={() => goto(r.id)}
              />
            ))}
            {dirtyRepos.length === 0 && behindRepos.length === 0 && (
              <EmptyState mascot="celebrating" mascotSize={72} title={t("dash.attention.empty")} />
            )}
          </AttnList>
        </GeneralCard>

        {anyProviderConnected && (
          <GeneralCard
            title={t("dash.mrs.title")}
            right={
              <CtaLink type="button" onClick={() => navigate(AppRoute.MERGE_REQUESTS)}>
                {t("dash.mrs.all")}
              </CtaLink>
            }
          >
            <MrList>
              {openPRs.slice(0, 4).map((p) => (
                <ClickableRow key={p.id} onClick={() => navigate(AppRoute.MERGE_REQUESTS)}>
                  <MrIcon
                    size={pxToRem(14)}
                    color={p.draft ? undefined : "#22c55e"}
                    style={{ flexShrink: 0 }}
                  />
                  <RowBody>
                    <RowPrimary>{p.title}</RowPrimary>
                    <RowSecondary>
                      #{p.number} · {p.author}
                    </RowSecondary>
                  </RowBody>
                  <CiDot state={ciFor(p.ciStatus) === "running" ? null : ciFor(p.ciStatus)} />
                </ClickableRow>
              ))}
              {openPRs.length === 0 && (
                <EmptyState mascot="snoozing" mascotSize={72} title={t("dash.mrs.empty")} />
              )}
            </MrList>
          </GeneralCard>
        )}

        <GeneralCard
          title={t("dash.commits.title")}
          right={
            <CtaLink type="button" onClick={() => navigate(AppRoute.ACTIVITY)}>
              {t("dash.commits.all")}
            </CtaLink>
          }
        >
          <Box>
            {commitsInitialLoad ? (
              <CommitListSkeleton rows={6} />
            ) : recent.length === 0 ? (
              <EmptyState mascot="snoozing" mascotSize={72} title={t("dash.commits.empty")} />
            ) : (
              recent.map((c) => (
                <ClickableRow key={`${c.repoId}-${c.sha}`} onClick={() => goto(c.repoId)}>
                  <AuthorAvatar name={c.author} email={c.authorEmail ?? undefined} size={24} />
                  <RowBody>
                    <RowPrimary>{c.summary || "—"}</RowPrimary>
                    <RowSecondary>
                      <Box component="span">{c.repoName}</Box>
                      <Sep component="span" variant="caption">
                        ·
                      </Sep>
                      <Box component="span">{c.author}</Box>
                      <Sep component="span" variant="caption">
                        ·
                      </Sep>
                      <Box component="span">{c.sha.slice(0, 7)}</Box>
                    </RowSecondary>
                  </RowBody>
                </ClickableRow>
              ))
            )}
          </Box>
        </GeneralCard>

        <LanguageDonutCard mix={languageMix} loading={commitsInitialLoad} />

        <QuickActionsCard />

        <HeatmapCard matrix={heatmap} loading={commitsInitialLoad} />
      </Grid>
    </Root>
  );
}

export default DashboardPage;
