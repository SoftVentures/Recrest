import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, MenuItem, Select, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
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
import { useCheckRuns } from "@/hooks/useCheckRuns";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { usePrEvents } from "@/hooks/usePrEvents";
import { useRecentCommits } from "@/hooks/useRecentCommits";
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
  ACTIVITY_DAYS,
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
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { useAppSelector } from "@/store/hooks";

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
  padding: "18px 22px 80px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
}) as typeof Box;

const PageHead = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  // Page head drops in first.
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
}) as typeof Box;

const PageTitle = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-0.2px",
  color: theme.palette.text.primary,
})) as typeof Typography;

const PageSub = styled(Typography)(({ theme }) => ({
  marginTop: 2,
  fontSize: 12,
  color: theme.palette.text.information,
})) as typeof Typography;

const FilterRow = styled(Box)({
  display: "flex",
  gap: 6,
}) as typeof Box;

const FilterSelect = styled(Select)(({ theme }) => ({
  height: 28,
  width: 200,
  fontSize: 12,
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderRadius: 8,
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.border.hover,
  },
  "& .MuiSelect-select": {
    padding: "4px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: "0 !important",
  },
}));

const SelectOption = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
}) as typeof Box;

const SelectDot = styled(Typography)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: theme.palette.text.informationLight,
  flexShrink: 0,
})) as typeof Typography;

const Hero = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 10,
  "@media (max-width: 1100px)": {
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
}) as typeof Box;

const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: 14,
  "@media (max-width: 1400px)": {
    gridTemplateColumns: "repeat(8, 1fr)",
  },
  "@media (max-width: 900px)": {
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
}) as typeof Box;

const Span = styled(Box, { shouldForwardProp: (p) => p !== "cols" })<{ cols: number }>(
  ({ cols }) => ({
    gridColumn: cols >= 12 ? "1 / -1" : `span ${cols}`,
    minWidth: 0,
    "@media (max-width: 1400px)": {
      gridColumn: cols >= 12 ? "1 / -1" : "span 4",
    },
    "@media (max-width: 900px)": {
      gridColumn: "1 / -1",
    },
  }),
);

const SpanStack = styled(Span)({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

export default function ActivityPage() {
  const { t } = useTranslation();
  const repos = useEnrichedRepos();
  const { commits, loading: commitsLoading } = useRecentCommits({ days: ACTIVITY_DAYS });
  const { events: prEvents, loading: prEventsLoading } = usePrEvents({ days: ACTIVITY_DAYS });
  const { summaries: checkRuns, loading: checksLoading } = useCheckRuns({ commits });
  const prsByRepo = useAppSelector((s) => s.prs.items);
  const prsLoading = useAppSelector((s) => s.prs.loading);

  const commitsBusy = commitsLoading && commits.length === 0;
  const prEventsBusy = prEventsLoading && prEvents.length === 0;
  const checksBusy = checksLoading && checkRuns.length === 0;
  const prsBusy = prsLoading && Object.keys(prsByRepo).length === 0;

  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const reposById = useMemo(() => {
    const m = new Map<string, (typeof repos)[number]>();
    for (const r of repos) m.set(r.id, r);
    return m;
  }, [repos]);
  const repoNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of repos) m[r.id] = r.name;
    return m;
  }, [repos]);
  const allRepoIds = useMemo(() => repos.map((r) => r.id), [repos]);

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
    () => (selectedRepo === "all" ? prEvents : prEvents.filter((e) => e.repoId === selectedRepo)),
    [prEvents, selectedRepo],
  );

  const filteredCheckRuns = useMemo(
    () => (selectedRepo === "all" ? checkRuns : checkRuns.filter((s) => s.repoId === selectedRepo)),
    [checkRuns, selectedRepo],
  );

  const filteredPrsByRepo = useMemo(() => {
    if (selectedRepo === "all") return prsByRepo;
    const p = prsByRepo[selectedRepo];
    return p ? { [selectedRepo]: p } : {};
  }, [prsByRepo, selectedRepo]);

  const authorOptions = useMemo(() => {
    const buckets = computeLeaderboard(
      selectedRepo === "all" ? commits : commits.filter((c) => c.repoId === selectedRepo),
      today,
      Number.POSITIVE_INFINITY,
      {},
    );
    return buckets.map((b) => ({ key: b.author, name: b.author, email: b.email }));
  }, [commits, selectedRepo, today]);

  const stats = useMemo(
    () => computeActivityStats(filteredCommits, today, allRepoIds),
    [filteredCommits, today, allRepoIds],
  );
  const stacked = useMemo(
    () => computeStackedChart(filteredCommits, today),
    [filteredCommits, today],
  );
  const leaderboard = useMemo(
    () => computeLeaderboard(filteredCommits, today, 5, {}),
    [filteredCommits, today],
  );
  const heatmap = useMemo(() => computeHeatmap(filteredCommits, today), [filteredCommits, today]);
  const clock = useMemo(() => computeAuthorClock(filteredCommits), [filteredCommits]);
  const languageMix = useMemo(
    () => computeLanguageMix(filteredCommits, reposById),
    [filteredCommits, reposById],
  );
  const churn = useMemo(() => computeChurn(repos), [repos]);
  const velocity = useMemo(
    () => computePrVelocity(filteredPrEvents, today),
    [filteredPrEvents, today],
  );
  const ttm = useMemo(() => computeTimeToMerge(filteredPrEvents), [filteredPrEvents]);
  const reviewQueue = useMemo(
    () => computeReviewQueue(filteredPrsByRepo, reposById),
    [filteredPrsByRepo, reposById],
  );
  const passRate = useMemo(
    () => computeCiPassRate(filteredCheckRuns, today),
    [filteredCheckRuns, today],
  );
  const flaky = useMemo(
    () => computeFlakyRepos(filteredCheckRuns, reposById),
    [filteredCheckRuns, reposById],
  );

  // Sparkline for the CommitsHero — daily commit counts, today at index 0.
  const sparkline = useMemo(() => {
    const arr = Array.from({ length: ACTIVITY_DAYS }, () => 0);
    for (const c of filteredCommits) {
      const d = Math.floor(
        (today.getTime() - new Date(c.timestamp).setHours(0, 0, 0, 0)) / 86_400_000,
      );
      if (d >= 0 && d < ACTIVITY_DAYS) arr[d] = (arr[d] ?? 0) + 1;
    }
    return arr;
  }, [filteredCommits, today]);

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
          <Box sx={{ minWidth: 0 }}>
            <PageTitle component="h2">{t("activity.chart.title")}</PageTitle>
            <PageSub>
              {t("activity.chart.sub", { total })}
              {selectedRepo !== "all" && ` · ${repoNameById[selectedRepo] ?? ""}`}
            </PageSub>
          </Box>
          <FilterRow>
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
              {repos.map((r) => (
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

        <Hero>
          <CommitsHero commits={stats.commits} sparkline={sparkline} />
          <AuthorsHero authors={stats.authors} topAuthors={topAuthors} />
          <OpenPrsHero prsByRepo={filteredPrsByRepo} />
          <CiHealthHero summaries={filteredCheckRuns} />
        </Hero>

        <Grid>
          <Span cols={8}>
            <StackedChartCard stacked={stacked} total={total} loading={commitsBusy} />
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
            <PrVelocityCard rows={velocity} loading={prEventsBusy} />
          </Span>
          <Span cols={3}>
            <TimeToMergeCard buckets={ttm} loading={prEventsBusy} />
          </Span>
          <Span cols={3}>
            <ReviewQueueCard entries={reviewQueue} loading={prsBusy} />
          </Span>

          <Span cols={8}>
            <CiPassRateCard rows={passRate} summaries={filteredCheckRuns} loading={checksBusy} />
          </Span>
          <Span cols={4}>
            <FlakyReposCard rows={flaky} loading={checksBusy} />
          </Span>

          <Span cols={7}>
            <LeaderboardCard buckets={leaderboard} loading={commitsBusy} />
          </Span>
          <SpanStack cols={5}>
            <StreakCard streak={stats.currentStreak} longest={stats.longestStreak} />
            <BusiestPeakCard stats={stats} />
            <QuietestReposCard quietestRepoIds={stats.quietestRepos} reposById={reposById} />
          </SpanStack>
        </Grid>

        <Timeline
          commits={filteredCommits}
          prEvents={filteredPrEvents}
          checkRuns={filteredCheckRuns}
          today={today}
          reposById={reposById}
        />
      </Page>
    </Root>
  );
}
