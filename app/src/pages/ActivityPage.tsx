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
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
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
import { signatureKey } from "@/lib/authorNormalize";
import { useAppSelector } from "@/store/hooks";

/** Stable empty-aliases reference so `useAppSelector` doesn't return a new
 *  literal `{}` on every render when the field is absent. */
const EMPTY_ALIASES: Record<string, string> = {};

export function ActivityPage() {
  const { t } = useTranslation();
  useScrollRestoration("activity");
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

  const authorAliases = useAppSelector((s) => s.settings.authorAliases) ?? EMPTY_ALIASES;

  // Author filter matches by `signatureKey(name, email)` so Unicode variants
  // of the same person (Müller / Mueller) all pass through together. This
  // mirrors how `computeLeaderboard` already groups authors and keeps the
  // dropdown options in lockstep with leaderboard rows.
  const resolveAuthorKey = useMemo(() => {
    return (name: string, email: string | null | undefined, fallback?: string | null) => {
      const raw = fallback ?? signatureKey(name, email ?? null);
      return authorAliases[raw] ?? raw;
    };
  }, [authorAliases]);

  const filteredCommits = useMemo(
    () =>
      commits.filter((c) => {
        if (selectedRepo !== "all" && c.repoId !== selectedRepo) return false;
        if (selectedAuthor !== "all") {
          const key = resolveAuthorKey(c.author, c.authorEmail ?? null, c.signatureKey ?? null);
          if (key !== selectedAuthor) return false;
        }
        return true;
      }),
    [commits, selectedRepo, selectedAuthor, resolveAuthorKey],
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

  // Build the author dropdown options from a leaderboard over all commits in
  // the (repo-scoped) window, *not* the author-filtered set. We rely on
  // `computeLeaderboard` to dedupe by `signatureKey` so the dropdown shows
  // each person exactly once, even when their git config emits the same
  // identity under multiple Unicode/ASCII spellings (Plan 1 §A.4).
  const authorScopeCommits = useMemo(
    () => (selectedRepo === "all" ? commits : commits.filter((c) => c.repoId === selectedRepo)),
    [commits, selectedRepo],
  );
  const authorOptions = useMemo(() => {
    // Generous limit — we want every contributor in the dropdown, not the
    // top-5 leaderboard. ACTIVITY_DAYS × repos is the realistic upper bound.
    const buckets = computeLeaderboard(
      authorScopeCommits,
      today,
      Number.POSITIVE_INFINITY,
      authorAliases,
    );
    return buckets.map((b) => ({
      key: resolveAuthorKey(b.author, b.email),
      name: b.author,
      email: b.email,
    }));
  }, [authorScopeCommits, today, authorAliases, resolveAuthorKey]);

  // Lookup helpers used by the trigger pill and the alias-aware filtering.
  const authorOptionByKey = useMemo(() => {
    const map = new Map<string, (typeof authorOptions)[number]>();
    for (const o of authorOptions) map.set(o.key, o);
    return map;
  }, [authorOptions]);

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
    () => computeLeaderboard(filteredCommits, today, 5, authorAliases),
    [filteredCommits, today, authorAliases],
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
        email: b.email,
      })),
    [leaderboard],
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
                  (() => {
                    const opt = authorOptionByKey.get(selectedAuthor);
                    return (
                      <span className="flex items-center gap-2">
                        <AuthorAvatar
                          name={opt?.name ?? selectedAuthor}
                          email={opt?.email ?? null}
                          size={16}
                        />
                        <span className="truncate">{opt?.name ?? selectedAuthor}</span>
                      </span>
                    );
                  })()
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
              {authorOptions.map((a) => (
                <SelectItem key={a.key} value={a.key}>
                  <span className="flex items-center gap-2">
                    <AuthorAvatar name={a.name} email={a.email} size={16} />
                    <span className="truncate">{a.name}</span>
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
