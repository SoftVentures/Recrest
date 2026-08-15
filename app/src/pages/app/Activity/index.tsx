import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, MenuItem, Select, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import LazyMount from "@/components/atoms/LazyMount";
import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";
import Timeline from "@/components/organisms/activity/Timeline";
import AuthorClockCard from "@/components/organisms/activity/cards/AuthorClockCard";
import AuthorsHero from "@/components/organisms/activity/cards/AuthorsHero";
import BusiestPeakCard from "@/components/organisms/activity/cards/BusiestPeakCard";
import ChurnCard from "@/components/organisms/activity/cards/ChurnCard";
import CiHealthHero from "@/components/organisms/activity/cards/CiHealthHero";
import CiPassRateCard from "@/components/organisms/activity/cards/CiPassRateCard";
import CommitsHero from "@/components/organisms/activity/cards/CommitsHero";
import FlakyReposCard from "@/components/organisms/activity/cards/FlakyReposCard";
import HeatmapCard from "@/components/organisms/activity/cards/HeatmapCard";
import LanguageDonutCard from "@/components/organisms/activity/cards/LanguageDonutCard";
import LeaderboardCard from "@/components/organisms/activity/cards/LeaderboardCard";
import OpenPrsHero from "@/components/organisms/activity/cards/OpenPrsHero";
import PrVelocityCard from "@/components/organisms/activity/cards/PrVelocityCard";
import QuietestReposCard from "@/components/organisms/activity/cards/QuietestReposCard";
import ReviewQueueCard from "@/components/organisms/activity/cards/ReviewQueueCard";
import StackedChartCard from "@/components/organisms/activity/cards/StackedChartCard";
import StreakCard from "@/components/organisms/activity/cards/StreakCard";
import TimeToMergeCard from "@/components/organisms/activity/cards/TimeToMergeCard";
import ActiveWeekdayInsightCard from "@/components/organisms/activity/cards/insights/ActiveWeekdayInsightCard";
import AvgPerWeekInsightCard from "@/components/organisms/activity/cards/insights/AvgPerWeekInsightCard";
import LongestGapInsightCard from "@/components/organisms/activity/cards/insights/LongestGapInsightCard";
import StreakInsightCard from "@/components/organisms/activity/cards/insights/StreakInsightCard";
import TopAuthorsInsightCard from "@/components/organisms/activity/cards/insights/TopAuthorsInsightCard";
import TrendInsightCard from "@/components/organisms/activity/cards/insights/TrendInsightCard";
import { useActivityCommits } from "@/hooks/useActivityCommits";
import { useCheckRuns } from "@/hooks/useCheckRuns";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { usePrEvents } from "@/hooks/usePrEvents";
import { windowDaysOf } from "@/lib/activity/rangeBuckets";
import {
  computeAuthorClock,
  computeChurn,
  computeCiPassRate,
  computeFlakyRepos,
  computeHeatmap,
  computeLanguageMix,
  computePrVelocity,
  computeReviewQueue,
  computeTimeToMerge,
} from "@/lib/activityAggregates";
import {
  computeActivityStats,
  computeLeaderboard,
  computeStackedChart,
  startOfLocalDay,
} from "@/lib/activityStats";
import {
  PAGE_DUR_MD,
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  pgRise,
  pgZoom,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import {
  ACTIVITY_URL_PARAM_SINCE,
  ACTIVITY_URL_PARAM_UNTIL,
} from "@/lib/constants/activity.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  computeAvgCommitsPerWeek,
  computeLongestGap,
  computeMostActiveDayOfWeek,
  computeStreaks,
  computeTopAuthorsByPeriod,
  computeTrend,
} from "@/lib/insights";
import { setSelectedRange } from "@/store/actions/activity.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSelectedRange } from "@/store/selectors/activity.selectors";
import { fontPxToRem, mediaDown, pxToRem, pxToRems } from "@/theme/scale";

/* ──────────────────────────────────────────────────────────────────────────
 * ActivityPage — port of src-old `pages/ActivityPage.tsx`.
 *
 * Page chrome (head + 4-up KPI hero + 12-col bento grid) is implemented here.
 * Every card body lives in its own component under
 * `components/organisms/activity/cards/<Name>/` so the page itself only owns
 * data wiring + grid placement. All chrome and visualisations are MUI
 * `styled()` — no SCSS, no CSS-as-string, no className handoff.
 * ──────────────────────────────────────────────────────────────────────── */

const Root = styled(Box)({
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  // Reserve the scrollbar gutter so the page width stays constant whether
  // or not the scrollbar is currently drawn — eliminates the left/right
  // jump users see on page swap when the inner scrollbar pops in/out.
  scrollbarGutter: "stable",
}) as typeof Box;

const Page = styled(Box)({
  padding: pxToRems(18, 24, 80),
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(16),
}) as typeof Box;

const PageHead = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: pxToRem(14),
  flexWrap: "wrap",
  // Page head drops in first.
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
}) as typeof Box;

const PageTitle = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: fontPxToRem(18),
  fontWeight: 700,
  letterSpacing: "-0.2px",
  color: theme.palette.text.primary,
})) as typeof Typography;

const PageSub = styled(Typography)(({ theme }) => ({
  marginTop: pxToRem(2),
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
})) as typeof Typography;

const FilterRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
}) as typeof Box;

const FilterSelect = styled(Select)(({ theme }) => ({
  // Match the ActivitySourceToggle's GeneralButtonGroup (density "sm" = 32px) so
  // the header controls line up on one baseline.
  minHeight: pxToRem(32),
  width: pxToRem(200),
  fontSize: fontPxToRem(12),
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderRadius: 8,
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.border.hover,
  },
  "& .MuiSelect-select": {
    padding: pxToRems(4, 10),
    display: "flex",
    alignItems: "center",
    gap: pxToRem(8),
    minHeight: "0 !important",
  },
}));

const SelectOption = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  fontSize: fontPxToRem(12),
}) as typeof Box;

const SelectDot = styled(Typography)(({ theme }) => ({
  width: pxToRem(8),
  height: pxToRem(8),
  borderRadius: "50%",
  backgroundColor: theme.palette.text.informationLight,
  flexShrink: 0,
})) as typeof Typography;

const Hero = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: pxToRem(10),
  [mediaDown(1100, theme.uiScale)]: {
    gridTemplateColumns: "repeat(2, 1fr)",
  },
  // KPI tiles zoom in 50ms apart after the head.
  "& > *": {
    animation: `${pgZoom} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
  },
  "& > *:nth-of-type(1)": { animationDelay: "60ms" },
  "& > *:nth-of-type(2)": { animationDelay: "110ms" },
  "& > *:nth-of-type(3)": { animationDelay: "160ms" },
  "& > *:nth-of-type(4)": { animationDelay: "210ms" },
  ...prefersReducedMotionGuard,
})) as typeof Box;

const Grid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: pxToRem(14),
  [mediaDown(1400, theme.uiScale)]: {
    gridTemplateColumns: "repeat(8, 1fr)",
  },
  [mediaDown(900, theme.uiScale)]: {
    gridTemplateColumns: "1fr",
  },
  // Bento cards rise in after the hero row has settled (~280ms base).
  "& > *": {
    animation: `${pgRise} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
    animationDelay: "280ms",
  },
  "& > *:nth-of-type(2)": { animationDelay: "340ms" },
  "& > *:nth-of-type(3)": { animationDelay: "400ms" },
  "& > *:nth-of-type(4)": { animationDelay: "460ms" },
  "& > *:nth-of-type(5)": { animationDelay: "520ms" },
  "& > *:nth-of-type(6)": { animationDelay: "580ms" },
  "& > *:nth-of-type(7)": { animationDelay: "640ms" },
  "& > *:nth-of-type(n + 8)": { animationDelay: "700ms" },
  ...prefersReducedMotionGuard,
})) as typeof Box;

const Span = styled(Box, { shouldForwardProp: (p) => p !== "cols" })<{ cols: number }>(
  ({ theme, cols }) => ({
    gridColumn: cols >= 12 ? "1 / -1" : `span ${cols}`,
    minWidth: 0,
    [mediaDown(1400, theme.uiScale)]: {
      gridColumn: cols >= 12 ? "1 / -1" : "span 4",
    },
    [mediaDown(900, theme.uiScale)]: {
      gridColumn: "1 / -1",
    },
  }),
);

const SpanStack = styled(Span)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(14),
});

const HeadTitleCol = styled(Box)({ minWidth: 0 });

const TruncationBanner = styled(Box)(({ theme }) => ({
  padding: pxToRems(8, 12),
  borderRadius: 8,
  fontSize: fontPxToRem(12),
  color: theme.palette.warning.main,
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

export default function ActivityPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const range = useAppSelector(selectSelectedRange);

  // Number of whole days the selected range spans; every windowed aggregation
  // is bucketed against this instead of the old fixed 14-day window.
  const windowDays = useMemo(() => windowDaysOf(range), [range]);

  const [searchParams, setSearchParams] = useSearchParams();
  // Mount-only hydration: URL → store, only when both params parse cleanly AND
  // differ from the store's current range. Dispatching a value-equal range
  // would still swap the `range` reference and make `useActivityCommits` fire
  // a second identical `list_commits`. URL params win on mount; the store→URL
  // effect below then re-normalises the params to the store values.
  useEffect(() => {
    const since = searchParams.get(ACTIVITY_URL_PARAM_SINCE);
    const until = searchParams.get(ACTIVITY_URL_PARAM_UNTIL);
    if (
      since &&
      until &&
      (since !== range.since || until !== range.until) &&
      !Number.isNaN(Date.parse(since)) &&
      !Number.isNaN(Date.parse(until))
    ) {
      dispatch(setSelectedRange({ since, until }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydration; reading `range` for the comparison is intentional
  }, []);
  // store → URL (replace, don't push — range tweaks shouldn't spam history).
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(ACTIVITY_URL_PARAM_SINCE, range.since);
        next.set(ACTIVITY_URL_PARAM_UNTIL, range.until);
        return next;
      },
      { replace: true },
    );
  }, [range, setSearchParams]);

  const { commits, loading: commitsLoading, truncated } = useActivityCommits();
  // All-repos commit stream, deferred so the chunk-driven consumers below (CI
  // check-run fan-out + the author dropdown) don't refire on every 1,000-commit
  // chunk during a large fetch. Kept separate from the per-filter
  // `deferredCommits` so CI detection still spans every repo, not just the
  // currently filtered one.
  const deferredAllCommits = useDeferredValue(commits);
  const { events: prEvents, loading: prEventsLoading } = usePrEvents({ days: windowDays });
  const { summaries: checkRuns, loading: checksLoading } = useCheckRuns({
    commits: deferredAllCommits,
  });
  const prsByRepo = useAppSelector((s) => s.prs.items);
  const prsLoading = useAppSelector((s) => s.prs.loading);

  const commitsBusy = commitsLoading && commits.length === 0;
  const prEventsBusy = prEventsLoading && prEvents.length === 0;
  const checksBusy = checksLoading && checkRuns.length === 0;
  const prsBusy = prsLoading && Object.keys(prsByRepo).length === 0;

  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  // The All/Remote source toggle was removed — Activity always spans every
  // scanned repo (no provider-scoped subset).
  const scopedRepos = repos;

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const reposById = useMemo(() => {
    const m = new Map<string, (typeof scopedRepos)[number]>();
    for (const r of scopedRepos) m.set(r.id, r);
    return m;
  }, [scopedRepos]);
  const repoNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of scopedRepos) m[r.id] = r.name;
    return m;
  }, [scopedRepos]);
  const allRepoIds = useMemo(() => scopedRepos.map((r) => r.id), [scopedRepos]);

  const filteredCommits = useMemo(
    () =>
      commits.filter((c) => {
        if (selectedRepo !== "all" && c.repoId !== selectedRepo) return false;
        if (selectedAuthor !== "all" && c.author !== selectedAuthor) return false;
        return true;
      }),
    [commits, selectedRepo, selectedAuthor],
  );

  const filteredPrEvents = useMemo(
    () =>
      prEvents.filter((e) => {
        if (selectedRepo !== "all" && e.repoId !== selectedRepo) return false;
        return true;
      }),
    [prEvents, selectedRepo],
  );

  const filteredCheckRuns = useMemo(
    () =>
      checkRuns.filter((s) => {
        if (selectedRepo !== "all" && s.repoId !== selectedRepo) return false;
        return true;
      }),
    [checkRuns, selectedRepo],
  );

  const filteredPrsByRepo = useMemo(() => {
    const entries = Object.entries(prsByRepo).filter(([repoId]) => {
      if (selectedRepo !== "all" && repoId !== selectedRepo) return false;
      return true;
    });
    return Object.fromEntries(entries);
  }, [prsByRepo, selectedRepo]);

  // Defer the heavy chart inputs so a range-preset click paints the picker
  // state immediately and the ~20 chart/insight recomputes catch up in a
  // non-blocking transition render. windowDays is deferred alongside so each
  // chart always sees a coherent (commits, windowDays) pair — mixing a fresh
  // window with stale commits would mislabel the bucket axes for one frame.
  const deferredCommits = useDeferredValue(filteredCommits);
  const deferredPrEvents = useDeferredValue(filteredPrEvents);
  const deferredCheckRuns = useDeferredValue(filteredCheckRuns);
  const deferredWindowDays = useDeferredValue(windowDays);

  // Keep the header spinner up until the *charts* settle, not just until the
  // fetch resolves: a cached range clears `activeRequestId` in a sub-frame, so
  // `commitsLoading` alone would never visibly fire on a range switch. A live
  // deferred transition (the deferred window still trailing the real one) means
  // the ~20 chart aggregations are mid-recompute — that's what the user waits on.
  const rangeBusy = commitsLoading || deferredWindowDays !== windowDays;

  const authorOptions = useMemo(() => {
    const scoped =
      selectedRepo === "all"
        ? deferredAllCommits
        : deferredAllCommits.filter((c) => c.repoId === selectedRepo);
    const buckets = computeLeaderboard(
      scoped,
      today,
      Number.POSITIVE_INFINITY,
      {},
      // Bucket across the whole selected range, not the default 14-day window —
      // otherwise authors (incl. bots like Renovate/Dependabot) who only
      // committed earlier in a wider range are silently missing from the filter.
      deferredWindowDays,
    );
    return buckets.map((b) => ({ key: b.author, name: b.author, email: b.email }));
  }, [deferredAllCommits, selectedRepo, today, deferredWindowDays]);

  const stats = useMemo(
    () => computeActivityStats(deferredCommits, today, allRepoIds, deferredWindowDays),
    [deferredCommits, today, allRepoIds, deferredWindowDays],
  );
  const stacked = useMemo(
    () => computeStackedChart(deferredCommits, today, deferredWindowDays),
    [deferredCommits, today, deferredWindowDays],
  );
  const leaderboard = useMemo(
    () => computeLeaderboard(deferredCommits, today, 5, {}, deferredWindowDays),
    [deferredCommits, today, deferredWindowDays],
  );
  const heatmap = useMemo(
    () => computeHeatmap(deferredCommits, today, deferredWindowDays),
    [deferredCommits, today, deferredWindowDays],
  );
  const clock = useMemo(() => computeAuthorClock(deferredCommits), [deferredCommits]);
  const languageMix = useMemo(
    () => computeLanguageMix(deferredCommits, reposById),
    [deferredCommits, reposById],
  );
  const churn = useMemo(() => computeChurn(scopedRepos), [scopedRepos]);
  const velocity = useMemo(
    () => computePrVelocity(deferredPrEvents, today, deferredWindowDays),
    [deferredPrEvents, today, deferredWindowDays],
  );
  const ttm = useMemo(() => computeTimeToMerge(deferredPrEvents), [deferredPrEvents]);
  const reviewQueue = useMemo(
    () => computeReviewQueue(filteredPrsByRepo, reposById),
    [filteredPrsByRepo, reposById],
  );
  const passRate = useMemo(
    () => computeCiPassRate(deferredCheckRuns, today, deferredWindowDays),
    [deferredCheckRuns, today, deferredWindowDays],
  );
  const flaky = useMemo(
    () => computeFlakyRepos(deferredCheckRuns, reposById),
    [deferredCheckRuns, reposById],
  );

  const insights = useMemo(
    () => ({
      streaks: computeStreaks(deferredCommits, today),
      trend: computeTrend(deferredCommits, 30, today),
      // Top authors follow the selected range so the count matches the author
      // dropdown and the "Aktive Autor:innen" KPI — a hard-coded 30-day period
      // showed 3 authors while a 7-day range had only 2 active.
      topAuthors: computeTopAuthorsByPeriod(deferredCommits, deferredWindowDays, 3, today),
      weekday: computeMostActiveDayOfWeek(deferredCommits),
      avgPerWeek: computeAvgCommitsPerWeek(deferredCommits),
      gap: computeLongestGap(deferredCommits),
    }),
    [deferredCommits, today, deferredWindowDays],
  );

  // Sparkline for the CommitsHero — daily commit counts, today at index 0.
  // CommitsHero only renders the first 7 entries, so cap the buffer length to
  // avoid building a multi-year array for wide ranges (e.g. the "1y" preset).
  const sparkline = useMemo(() => {
    const len = Math.min(deferredWindowDays, 90);
    const arr = Array.from({ length: len }, () => 0);
    for (const c of deferredCommits) {
      const d = Math.floor(
        (today.getTime() - new Date(c.timestamp).setHours(0, 0, 0, 0)) / 86_400_000,
      );
      if (d >= 0 && d < len) arr[d] = (arr[d] ?? 0) + 1;
    }
    return arr;
  }, [deferredCommits, today, deferredWindowDays]);

  const topAuthors = useMemo(
    () =>
      leaderboard.map((b) => ({
        name: b.author,
        email: b.email,
      })),
    [leaderboard],
  );

  const total = stats.commits.current + stats.commits.previous;

  return (
    <Root data-testid={TEST_IDS.activity.page}>
      <Page>
        <PageHead>
          <HeadTitleCol>
            <PageTitle component="h2">{t("activity.chart.title", { days: windowDays })}</PageTitle>
            <PageSub>
              {t("activity.chart.sub", { total })}
              {selectedRepo !== "all" && ` · ${repoNameById[selectedRepo] ?? ""}`}
            </PageSub>
          </HeadTitleCol>
          <FilterRow>
            {rangeBusy && (
              <GeneralCircularLoader
                size={CircularLoaderSize.SM}
                aria-label={t("activity.loading")}
              />
            )}
            <FilterSelect
              value={selectedRepo}
              size="small"
              onChange={(e) => setSelectedRepo(e.target.value as string)}
              data-testid={TEST_IDS.activity.repoFilter}
            >
              <MenuItem value="all">
                <SelectOption>
                  <SelectDot component="span" variant="caption" />
                  <Box component="span">{t("activity.filter.all_repos")}</Box>
                </SelectOption>
              </MenuItem>
              {scopedRepos.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <SelectOption>
                    <RepoAvatar repo={r} size={16} radius={4} />
                    <Box component="span">{r.name}</Box>
                  </SelectOption>
                </MenuItem>
              ))}
            </FilterSelect>
            <FilterSelect
              value={selectedAuthor}
              size="small"
              onChange={(e) => setSelectedAuthor(e.target.value as string)}
              data-testid={TEST_IDS.activity.authorFilter}
            >
              <MenuItem value="all">
                <SelectOption>
                  <SelectDot component="span" variant="caption" />
                  <Box component="span">{t("activity.filter.all_authors")}</Box>
                </SelectOption>
              </MenuItem>
              {authorOptions.map((a) => (
                <MenuItem key={a.key} value={a.key}>
                  <SelectOption>
                    <AuthorAvatar name={a.name} email={a.email ?? undefined} size={16} />
                    <Box component="span">{a.name}</Box>
                  </SelectOption>
                </MenuItem>
              ))}
            </FilterSelect>
          </FilterRow>
        </PageHead>

        {truncated && (
          <TruncationBanner data-testid={TEST_IDS.activity.truncatedBanner}>
            {t("activity.range.truncated_banner")}
          </TruncationBanner>
        )}

        <Hero>
          <CommitsHero commits={stats.commits} sparkline={sparkline} />
          <AuthorsHero authors={stats.authors} topAuthors={topAuthors} />
          <OpenPrsHero prsByRepo={filteredPrsByRepo} />
          <CiHealthHero summaries={deferredCheckRuns} />
        </Hero>

        <Grid>
          <Span cols={4}>
            <StreakInsightCard streaks={insights.streaks} loading={commitsBusy} />
          </Span>
          <Span cols={4}>
            <TrendInsightCard trend={insights.trend} periodDays={30} loading={commitsBusy} />
          </Span>
          <Span cols={4}>
            <TopAuthorsInsightCard
              authors={insights.topAuthors}
              periodDays={deferredWindowDays}
              loading={commitsBusy}
            />
          </Span>
          <Span cols={4}>
            <ActiveWeekdayInsightCard weekday={insights.weekday} loading={commitsBusy} />
          </Span>
          <Span cols={4}>
            <AvgPerWeekInsightCard avg={insights.avgPerWeek} loading={commitsBusy} />
          </Span>
          <Span cols={4}>
            <LongestGapInsightCard gap={insights.gap} loading={commitsBusy} />
          </Span>
        </Grid>

        <Grid>
          <Span cols={8}>
            <StackedChartCard
              stacked={stacked}
              total={total}
              windowDays={deferredWindowDays}
              loading={commitsBusy}
            />
          </Span>
          <Span cols={4}>
            <LanguageDonutCard mix={languageMix} loading={commitsBusy} />
          </Span>

          <Span cols={4}>
            <HeatmapCard matrix={heatmap} loading={commitsBusy} />
          </Span>
          <Span cols={4}>
            <AuthorClockCard hours={clock} loading={commitsBusy} />
          </Span>
          <Span cols={4}>
            <ChurnCard rows={churn} />
          </Span>

          <Span cols={6}>
            <LazyMount minHeight={200}>
              <PrVelocityCard
                rows={velocity}
                windowDays={deferredWindowDays}
                loading={prEventsBusy}
              />
            </LazyMount>
          </Span>
          <Span cols={3}>
            <LazyMount minHeight={200}>
              <TimeToMergeCard
                buckets={ttm}
                windowDays={deferredWindowDays}
                loading={prEventsBusy}
              />
            </LazyMount>
          </Span>
          <Span cols={3}>
            <LazyMount minHeight={200}>
              <ReviewQueueCard entries={reviewQueue} loading={prsBusy} />
            </LazyMount>
          </Span>

          <Span cols={8}>
            <LazyMount minHeight={260}>
              <CiPassRateCard
                rows={passRate}
                summaries={deferredCheckRuns}
                windowDays={deferredWindowDays}
                loading={checksBusy}
              />
            </LazyMount>
          </Span>
          <Span cols={4}>
            <LazyMount minHeight={260}>
              <FlakyReposCard rows={flaky} windowDays={deferredWindowDays} loading={checksBusy} />
            </LazyMount>
          </Span>

          <Span cols={7}>
            <LazyMount minHeight={260}>
              <LeaderboardCard
                buckets={leaderboard}
                windowDays={deferredWindowDays}
                loading={commitsBusy}
              />
            </LazyMount>
          </Span>
          <SpanStack cols={5}>
            <LazyMount minHeight={260}>
              <StreakCard streak={stats.currentStreak} longest={stats.longestStreak} />
              <BusiestPeakCard stats={stats} />
              <QuietestReposCard quietestRepoIds={stats.quietestRepos} reposById={reposById} />
            </LazyMount>
          </SpanStack>
        </Grid>

        <LazyMount minHeight={400}>
          <Timeline
            commits={deferredCommits}
            prEvents={deferredPrEvents}
            checkRuns={deferredCheckRuns}
            today={today}
            reposById={reposById}
            windowDays={deferredWindowDays}
          />
        </LazyMount>
      </Page>
    </Root>
  );
}
