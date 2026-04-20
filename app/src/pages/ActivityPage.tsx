import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";
import { Timeline } from "@/components/organisms/activity/Timeline";
import { AuthorClockCard } from "@/components/organisms/activity/cards/AuthorClockCard";
import { AuthorsHero } from "@/components/organisms/activity/cards/AuthorsHero";
import { BusiestPeakCard } from "@/components/organisms/activity/cards/BusiestPeakCard";
import { ChurnCard } from "@/components/organisms/activity/cards/ChurnCard";
import { CiHealthHero } from "@/components/organisms/activity/cards/CiHealthHero";
import { CiPassRateCard } from "@/components/organisms/activity/cards/CiPassRateCard";
import { CommitsHero } from "@/components/organisms/activity/cards/CommitsHero";
import { FlakyReposCard } from "@/components/organisms/activity/cards/FlakyReposCard";
import { HeatmapCard } from "@/components/organisms/activity/cards/HeatmapCard";
import { LanguageDonutCard } from "@/components/organisms/activity/cards/LanguageDonutCard";
import { LeaderboardCard } from "@/components/organisms/activity/cards/LeaderboardCard";
import { OpenPrsHero } from "@/components/organisms/activity/cards/OpenPrsHero";
import { PrVelocityCard } from "@/components/organisms/activity/cards/PrVelocityCard";
import { QuietestReposCard } from "@/components/organisms/activity/cards/QuietestReposCard";
import { ReviewQueueCard } from "@/components/organisms/activity/cards/ReviewQueueCard";
import { StackedChartCard } from "@/components/organisms/activity/cards/StackedChartCard";
import { StreakCard } from "@/components/organisms/activity/cards/StreakCard";
import { TimeToMergeCard } from "@/components/organisms/activity/cards/TimeToMergeCard";
import { useCheckRuns } from "@/hooks/useCheckRuns";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { usePrEvents } from "@/hooks/usePrEvents";
import { usePrPolling } from "@/hooks/useProviders";
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
import { useAppSelector } from "@/store/hooks";

export function ActivityPage() {
  const { t } = useTranslation();
  usePrPolling();
  const repos = useEnrichedRepos();
  const { commits, loading: commitsLoading } = useRecentCommits({ days: ACTIVITY_DAYS });
  const { events: prEvents, loading: prEventsLoading } = usePrEvents({
    days: ACTIVITY_DAYS,
  });
  const { summaries: checkRuns, loading: checksLoading } = useCheckRuns({ commits });
  const prsByRepo = useAppSelector((s) => s.prs.items);
  const prsLoading = useAppSelector((s) => s.prs.loading);
  // A card is in a loading state while its underlying dataset is still being
  // fetched AND no partial data is available yet — once any data lands we
  // show the real view even if a background refresh is still in flight.
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

  const authors = useMemo(() => {
    const s = new Set<string>();
    for (const c of commits) s.add(c.author);
    return [...s];
  }, [commits]);
  // First email we see for each author — feeds Gravatar so filter pills and
  // leaderboard chips match the avatars in the timeline feed.
  const emailByAuthor = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of commits) {
      if (!map.has(c.author) && c.authorEmail) map.set(c.author, c.authorEmail);
    }
    return map;
  }, [commits]);

  const allRepoIds = useMemo(() => repos.map((r) => r.id), [repos]);

  const stats = useMemo(
    () => computeActivityStats(filteredCommits, today, allRepoIds),
    [filteredCommits, today, allRepoIds],
  );
  const stacked = useMemo(
    () => computeStackedChart(filteredCommits, today),
    [filteredCommits, today],
  );
  const leaderboard = useMemo(
    () => computeLeaderboard(filteredCommits, today),
    [filteredCommits, today],
  );

  const sparkline = useMemo(() => {
    // Compute daily commit counts aligned to day-0 = today.
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
        email: emailByAuthor.get(b.author) ?? null,
      })),
    [leaderboard, emailByAuthor],
  );

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
  const heatmap = useMemo(() => computeHeatmap(filteredCommits, today), [filteredCommits, today]);
  const clock = useMemo(() => computeAuthorClock(filteredCommits), [filteredCommits]);
  const mix = useMemo(
    () => computeLanguageMix(filteredCommits, reposById),
    [filteredCommits, reposById],
  );
  const churn = useMemo(() => computeChurn(repos), [repos]);

  const total = stats.commits.current + stats.commits.previous;

  return (
    <div className="a-activity" data-testid="activity-page">
      <div className="a-act-page-h">
        <div>
          <h2>{t("activity.chart.title")}</h2>
          <div className="a-act-page-sub">
            {t("activity.chart.sub", { total })}
            {selectedRepo !== "all" &&
              " · " + (repos.find((r) => r.id === selectedRepo)?.name ?? "")}
          </div>
        </div>
        <div className="a-act-filters">
          <Select value={selectedRepo} onValueChange={setSelectedRepo}>
            <SelectTrigger
              className="a-act-sel-trigger h-8 w-[200px]"
              aria-label={t("activity.filter.all_repos")}
            >
              <SelectValue>
                {selectedRepo === "all" ? (
                  <span className="flex items-center gap-2">
                    <span className="a-act-sel-dot" />
                    <span className="truncate">{t("activity.filter.all_repos")}</span>
                  </span>
                ) : (
                  (() => {
                    const r = repos.find((rr) => rr.id === selectedRepo);
                    return r ? (
                      <span className="flex items-center gap-2">
                        <RepoAvatar repo={r} size={16} radius={4} />
                        <span className="truncate">{r.name}</span>
                      </span>
                    ) : (
                      <span>—</span>
                    );
                  })()
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <span className="a-act-sel-dot" />
                  <span>{t("activity.filter.all_repos")}</span>
                </span>
              </SelectItem>
              {repos.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-2">
                    <RepoAvatar repo={r} size={16} radius={4} />
                    <span className="truncate">{r.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
            <SelectTrigger
              className="a-act-sel-trigger h-8 w-[200px]"
              aria-label={t("activity.filter.all_authors")}
            >
              <SelectValue>
                {selectedAuthor === "all" ? (
                  <span className="flex items-center gap-2">
                    <span className="a-act-sel-dot" />
                    <span className="truncate">{t("activity.filter.all_authors")}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <AuthorAvatar
                      name={selectedAuthor}
                      email={emailByAuthor.get(selectedAuthor) ?? null}
                      size={16}
                    />
                    <span className="truncate">{selectedAuthor}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <span className="a-act-sel-dot" />
                  <span>{t("activity.filter.all_authors")}</span>
                </span>
              </SelectItem>
              {authors.map((a) => (
                <SelectItem key={a} value={a}>
                  <span className="flex items-center gap-2">
                    <AuthorAvatar name={a} email={emailByAuthor.get(a) ?? null} size={16} />
                    <span className="truncate">{a}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="a-act-hero">
        <CommitsHero commits={stats.commits} sparkline={sparkline} />
        <AuthorsHero authors={stats.authors} topAuthors={topAuthors} />
        <OpenPrsHero prsByRepo={filteredPrsByRepo} />
        <CiHealthHero summaries={filteredCheckRuns} />
      </div>

      <div className="a-act-grid">
        <div className="a-act-span-8">
          <StackedChartCard stacked={stacked} total={total} loading={commitsBusy} />
        </div>
        <div className="a-act-span-4">
          <LanguageDonutCard mix={mix} loading={commitsBusy} />
        </div>

        <div className="a-act-span-4">
          <HeatmapCard matrix={heatmap} loading={commitsBusy} />
        </div>
        <div className="a-act-span-4">
          <AuthorClockCard hours={clock} loading={commitsBusy} />
        </div>
        <div className="a-act-span-4">
          <ChurnCard rows={churn} />
        </div>

        <div className="a-act-span-6">
          <PrVelocityCard rows={velocity} loading={prEventsBusy} />
        </div>
        <div className="a-act-span-3">
          <TimeToMergeCard buckets={ttm} loading={prEventsBusy} />
        </div>
        <div className="a-act-span-3">
          <ReviewQueueCard entries={reviewQueue} loading={prsBusy} />
        </div>

        <div className="a-act-span-8">
          <CiPassRateCard rows={passRate} summaries={filteredCheckRuns} loading={checksBusy} />
        </div>
        <div className="a-act-span-4">
          <FlakyReposCard rows={flaky} loading={checksBusy} />
        </div>

        <div className="a-act-span-7">
          <LeaderboardCard buckets={leaderboard} loading={commitsBusy} />
        </div>
        <div className="a-act-span-5 a-act-stack">
          <StreakCard streak={stats.currentStreak} longest={stats.longestStreak} />
          <BusiestPeakCard stats={stats} />
          <QuietestReposCard quietestRepoIds={stats.quietestRepos} reposById={reposById} />
        </div>
      </div>

      <Timeline
        commits={filteredCommits}
        prEvents={filteredPrEvents}
        checkRuns={filteredCheckRuns}
        today={today}
        reposById={reposById}
      />
    </div>
  );
}
