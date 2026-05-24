import { useMemo } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, PrState, RepoStatusChip } from "@recrest/shared";

import { FolderGit2, GitBranch as MrIcon } from "lucide-react";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import StaggeredReveal from "@/components/atoms/transitions/StaggeredReveal";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import ClickableRow from "@/components/molecules/rows/ClickableRow";
import HeatmapCard from "@/components/organisms/activity/cards/HeatmapCard";
import LanguageDonutCard from "@/components/organisms/activity/cards/LanguageDonutCard";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { computeHeatmap, computeLanguageMix } from "@/lib/activityAggregates";
import {
  PAGE_DUR_MD,
  PAGE_EASE,
  pgRise,
  pgZoom,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { ciFor } from "@/lib/constants/ciStates.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import ActivityChart from "@/pages/app/Dashboard/parts/ActivityChart";
import AttentionRow from "@/pages/app/Dashboard/parts/AttentionRow";
import CiDot from "@/pages/app/Dashboard/parts/CiDot";
import Kpi from "@/pages/app/Dashboard/parts/Kpi";
import QuickActionsCard from "@/pages/app/Dashboard/parts/QuickActionsCard";
import {
  ActivityBarsSkeleton,
  CardBlockSkeleton,
  CommitListSkeleton,
  KpiSkeleton,
} from "@/pages/app/Dashboard/parts/skeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/reducers/uiReducer";

const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  backgroundColor: theme.palette.background.default,
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  scrollbarGutter: "stable",
})) as typeof Box;

const Kpis = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  animation: `${pgZoom} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
}) as typeof Box;

const AheadBehindValue = styled(Box)({
  display: "inline-flex",
  alignItems: "baseline",
  gap: 4,
  lineHeight: 1,
}) as typeof Box;

const AheadBehindArrow = styled(Box)(({ theme }) => ({
  fontSize: 22,
  fontWeight: 600,
  color: theme.palette.text.information,
})) as typeof Box;

const AheadBehindSep = styled(Box)(({ theme }) => ({
  fontWeight: 400,
  color: theme.palette.text.informationLight,
  margin: "0 6px",
})) as typeof Box;

const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gridAutoRows: "min-content",
  gap: 12,
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
  fontSize: 11.5,
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
  gap: 2,
}) as typeof Box;

const RowBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const RowPrimary = styled(Box)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 500,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

const RowSecondary = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 6,
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

const Sep = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
})) as typeof Typography;

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

  const agg = useMemo(() => {
    const out = Array<number>(14).fill(0);
    for (const r of repos) r.activity.forEach((v, i) => (out[i] = (out[i] ?? 0) + v));
    return out;
  }, [repos]);
  const totalCommits = agg.reduce((s, v) => s + v, 0);
  const maxDay = Math.max(...agg, 1);

  // Keep the limit at the default (500) instead of clamping to 6 — the
  // weekday × hour heatmap needs the full 14-day window to fill its 7×24
  // matrix, even though the Recent-commits list only shows the first 6.
  const { commits: recentCommits, loading: commitsLoading } = useRecentCommits({ days: 14 });
  const recent = useMemo(() => {
    const byRepo = new Map(repos.map((r) => [r.id, r] as const));
    return recentCommits.slice(0, 6).map((c) => ({ ...c, repo: byRepo.get(c.repoId) }));
  }, [recentCommits, repos]);
  const commitsInitialLoad = commitsLoading && recent.length === 0;

  const heatmapToday = useMemo(() => new Date(), []);
  const heatmap = useMemo(
    () => computeHeatmap(recentCommits, heatmapToday),
    [recentCommits, heatmapToday],
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
          <GeneralCard title={t("dash.activity.title")} sx={{ gridColumn: "1 / -1" }}>
            <ActivityBarsSkeleton />
          </GeneralCard>
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
    <Root data-testid={TEST_IDS.dashboard.page}>
      <StaggeredReveal component={Kpis} step={50} maxDelay={200}>
        <Kpi
          label={t("dash.kpi.repositories")}
          value={repos.length}
          sub={t("dash.kpi.repositories_sub", { count: dirtyRepos.length })}
          onClick={() => navigate(AppRoute.REPOS)}
        />
        {anyProviderConnected ? (
          <Kpi
            label={t("dash.kpi.merge_requests")}
            value={openPRs.length}
            sub={t("dash.kpi.merge_requests_sub", { count: prs.filter((p) => p.draft).length })}
            accent
            onClick={() => navigate(AppRoute.MERGE_REQUESTS)}
          />
        ) : (
          <Kpi
            label={t("dash.kpi.clean_repos")}
            value={cleanReposCount}
            sub={t("dash.kpi.clean_repos_sub", {
              count: cleanReposCount,
              total: repos.length,
            })}
            onClick={() => navigate(AppRoute.REPOS)}
          />
        )}
        <Kpi
          label={t("dash.kpi.ahead_behind")}
          value={
            <AheadBehindValue component="span">
              <AheadBehindArrow component="span">↑</AheadBehindArrow>
              {totalAhead}
              <AheadBehindSep component="span">/</AheadBehindSep>
              <AheadBehindArrow component="span">↓</AheadBehindArrow>
              {totalBehind}
            </AheadBehindValue>
          }
          sub={t("dash.kpi.ahead_behind_sub")}
          onClick={() => navigate(AppRoute.BRANCHES)}
        />
        <Kpi
          label={t("dash.kpi.commits")}
          value={totalCommits}
          sub={t("dash.kpi.commits_sub", { count: maxDay })}
          onClick={() => navigate(AppRoute.ACTIVITY)}
        />
      </StaggeredReveal>

      <Grid>
        <ActivityChart
          agg={agg}
          maxDay={maxDay}
          title={t("dash.activity.title")}
          meta={t("dash.activity.meta", { total: totalCommits, repos: repos.length })}
        />

        <GeneralCard
          title={t("dash.attention.title")}
          right={
            <Typography variant="caption" sx={{ fontSize: 11.5, color: "text.information" }}>
              {Math.min(dirtyRepos.length, 3) + Math.min(behindRepos.length, 2)} items
            </Typography>
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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {openPRs.slice(0, 4).map((p) => (
                <ClickableRow key={p.id} onClick={() => navigate(AppRoute.MERGE_REQUESTS)}>
                  <MrIcon
                    size={14}
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
            </Box>
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
