import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import type { RecentCommit } from "@recrest/shared";

import { Icon } from "@/components/atoms/Icon";
import { Skeleton } from "@/components/atoms/Skeleton";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";
import { CommitListSkeleton } from "@/components/molecules/skeletons/CommitListSkeleton";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import {
  ACTIVITY_DAYS,
  type ActivityStats,
  type AuthorBucket,
  type StackedDay,
  colorForRepo,
  computeActivityStats,
  computeLeaderboard,
  computeStackedChart,
  dayLabel,
  daysAgo,
  relativeWhen,
  startOfLocalDay,
} from "@/lib/activityStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";

function commitUrl(remote: string | null | undefined, sha: string): string | null {
  if (!remote) return null;
  const https = remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "");
  return `${https}/commit/${sha}`;
}

interface TimelineEntry extends RecentCommit {
  repo: EnrichedRepo | undefined;
  day: number;
  when: string;
}

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function AuthorAvatar({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <span
      className="a-act-author-av"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.45)),
      }}
      aria-hidden
    >
      {authorInitials(name)}
    </span>
  );
}

export function ActivityPage() {
  const { t } = useTranslation();
  const repos = useEnrichedRepos();
  const { commits, loading } = useRecentCommits({ days: ACTIVITY_DAYS });
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const reposById = useMemo(() => {
    const m = new Map<string, EnrichedRepo>();
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

  const timeline = useMemo(() => {
    const days: { day: number; items: TimelineEntry[] }[] = [];
    for (let d = 0; d < ACTIVITY_DAYS; d++) days.push({ day: d, items: [] });
    for (const c of filteredCommits) {
      const day = daysAgo(c.timestamp, today);
      if (day < 0) continue;
      days[day]!.items.push({
        ...c,
        repo: reposById.get(c.repoId),
        day,
        when: relativeWhen(c.timestamp, day),
      });
    }
    return days.filter((d) => d.items.length > 0);
  }, [filteredCommits, reposById, today]);

  const authors = useMemo(() => {
    const s = new Set<string>();
    for (const c of commits) s.add(c.author);
    return [...s];
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

  const total = stats.commits.current + stats.commits.previous;
  const peak = Math.max(1, ...stacked.map((d) => d.total));

  return (
    <div className="a-activity">
      <HeroStrip t={t} stats={stats} />

      <div className="a-act-chart-wrap">
        <div className="a-act-chart-h">
          <div>
            <h3>{t("activity.chart.title")}</h3>
            <div className="a-act-chart-sub">
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
                      <AuthorAvatar name={selectedAuthor} size={16} />
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
                      <AuthorAvatar name={a} size={16} />
                      <span className="truncate">{a}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <StackedChart stacked={stacked} peak={peak} />
        <div className="a-act-chart-axis">
          <span>14d ago</span>
          <span>7d</span>
          <span>today</span>
        </div>
      </div>

      <div className="a-act-row">
        <LeaderboardCard t={t} buckets={leaderboard} />
        <CadenceCard t={t} stats={stats} reposById={reposById} />
      </div>

      <div className="a-act-timeline">
        {timeline.map((day) => (
          <div key={day.day} className="a-act-day">
            <div className="a-act-day-h">
              <div className="a-act-day-lbl">{dayLabel(day.day)}</div>
              <div className="a-act-day-ct">
                {day.items.length} {t("activity.commits")}
              </div>
            </div>
            <div className="a-act-day-items">
              {day.items.map((c) => {
                const url = commitUrl(c.repo?.remoteUrl, c.sha);
                const openCommit = () => {
                  if (url) void openExternal(url);
                  else toast.info("No remote URL for this commit");
                };
                return (
                  <div
                    key={c.sha}
                    className="a-act-item"
                    role="button"
                    tabIndex={0}
                    onClick={openCommit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openCommit();
                      }
                    }}
                    title={url ?? "No remote URL"}
                    style={{ cursor: url ? "pointer" : "default" }}
                  >
                    <span
                      className="avatar sm"
                      style={{ background: "var(--accent-weak)", color: "var(--accent-ink)" }}
                    >
                      {authorInitials(c.author)}
                    </span>
                    <div className="a-act-item-body">
                      <div className="a-act-item-msg">{c.summary}</div>
                      <div className="a-act-item-meta">
                        {c.repo && <RepoAvatar repo={c.repo} size={14} radius={3} />}
                        <span className="a-act-item-repo">{c.repoName}</span>
                        <span className="a-dash-k-sep">·</span>
                        <span className="a-act-item-sha">{c.sha.slice(0, 7)}</span>
                        <span className="a-dash-k-sep">·</span>
                        <span>{c.when}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {loading && timeline.length === 0 && <ActivityListSkeleton />}
        {!loading && timeline.length === 0 && (
          <div className="a-dash-empty">{t("activity.empty")}</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

type TFn = ReturnType<typeof useTranslation>["t"];

function HeroStrip({ t, stats }: { t: TFn; stats: ActivityStats }) {
  return (
    <div className="a-act-hero">
      <KpiTile
        label={t("activity.kpi.commits_week")}
        value={stats.commits.current}
        delta={stats.commits.delta}
        t={t}
      />
      <KpiTile
        label={t("activity.kpi.authors_week")}
        value={stats.authors.current}
        delta={stats.authors.delta}
        t={t}
      />
      <KpiTile
        label={t("activity.kpi.repos_week")}
        value={stats.repos.current}
        delta={stats.repos.delta}
        t={t}
      />
      <StreakTile t={t} streak={stats.currentStreak} longest={stats.longestStreak} />
    </div>
  );
}

function KpiTile({
  label,
  value,
  delta,
  t,
}: {
  label: string;
  value: number;
  delta: number;
  t: TFn;
}) {
  const dir = delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const deltaLabel =
    delta === 0
      ? t("activity.kpi.delta_flat")
      : delta > 0
        ? t("activity.kpi.delta_up", { delta })
        : t("activity.kpi.delta_down", { delta });
  return (
    <div className={`a-act-kpi tone-${dir}`}>
      <div className="a-act-kpi-label">{label}</div>
      <div className="a-act-kpi-value">{value}</div>
      <div className="a-act-kpi-delta">
        {dir === "up" && <Icon name="arrowUp" size={11} />}
        {dir === "down" && <Icon name="arrowDown" size={11} />}
        <span>{deltaLabel}</span>
      </div>
    </div>
  );
}

function StreakTile({ t, streak, longest }: { t: TFn; streak: number; longest: number }) {
  const onFire = streak >= 3;
  const countLabel =
    streak === 1
      ? t("activity.kpi.streak_days_one", { count: streak })
      : t("activity.kpi.streak_days_other", { count: streak });
  return (
    <div className={`a-act-kpi a-act-streak${onFire ? " hot" : ""}`}>
      <div className="a-act-kpi-label">{t("activity.kpi.streak")}</div>
      <div className="a-act-kpi-value">
        {streak}
        {onFire && (
          <span className="a-act-streak-fire" aria-hidden>
            🔥
          </span>
        )}
      </div>
      <div className="a-act-kpi-delta">
        <span>
          {countLabel}
          {onFire ? ` · ${t("activity.kpi.on_fire")}` : ""}
          {longest > streak ? ` · best ${longest}` : ""}
        </span>
      </div>
    </div>
  );
}

function StackedChart({ stacked, peak }: { stacked: StackedDay[]; peak: number }) {
  const reversed = [...stacked].reverse();
  return (
    <div className="a-act-chart">
      {reversed.map((d) => {
        const h = Math.max(4, (d.total / peak) * 100);
        const tooltip =
          d.total === 0
            ? `${dayLabel(d.day)} · 0 commits`
            : `${dayLabel(d.day)} · ${d.total} commits\n` +
              d.segments.map((s) => `  ${s.repoName} × ${s.count}`).join("\n");
        return (
          <div key={d.day} className="a-act-chart-col" title={tooltip}>
            {d.total === 0 ? (
              <div
                className="a-act-chart-bar a-act-chart-empty"
                style={{ height: `${h}%`, opacity: 0.25 }}
              />
            ) : (
              <div className="a-act-chart-stack" style={{ height: `${h}%` }}>
                {d.segments.map((s) => (
                  <div
                    key={s.repoId}
                    className="a-act-chart-seg"
                    style={{
                      flex: s.count,
                      background: s.color,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardCard({ t, buckets }: { t: TFn; buckets: AuthorBucket[] }) {
  return (
    <div className="a-act-card">
      <div className="a-act-card-h">
        <h3>{t("activity.leaders.title")}</h3>
        <span className="a-act-card-sub">
          {t("activity.leaders.sub", { count: buckets.length })}
        </span>
      </div>
      {buckets.length === 0 ? (
        <div className="a-act-card-empty">{t("activity.leaders.empty")}</div>
      ) : (
        <ol className="a-act-lb">
          {buckets.map((b, idx) => (
            <li key={b.author} className="a-act-lb-row">
              <span className="a-act-lb-rank">{idx + 1}</span>
              <AuthorAvatar name={b.author} size={22} />
              <div className="a-act-lb-body">
                <div className="a-act-lb-top">
                  <span className="a-act-lb-name">{b.author}</span>
                  <span className="a-act-lb-count">
                    {b.count} · {Math.round(b.share * 100)}%
                  </span>
                </div>
                <div className="a-act-lb-bar">
                  <div
                    className="a-act-lb-bar-fill"
                    style={{ width: `${Math.max(4, b.share * 100)}%` }}
                  />
                </div>
                <MiniSpark values={b.sparkline} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MiniSpark({ values }: { values: number[] }) {
  const peak = Math.max(1, ...values);
  return (
    <div className="a-act-lb-spark" aria-hidden>
      {[...values].reverse().map((v, i) => (
        <span
          key={i}
          className="a-act-lb-spark-bar"
          style={{ height: `${Math.max(8, (v / peak) * 100)}%`, opacity: v === 0 ? 0.2 : 1 }}
        />
      ))}
    </div>
  );
}

function CadenceCard({
  t,
  stats,
  reposById,
}: {
  t: TFn;
  stats: ActivityStats;
  reposById: Map<string, EnrichedRepo>;
}) {
  return (
    <div className="a-act-card">
      <div className="a-act-card-h">
        <h3>{t("activity.cadence.title")}</h3>
      </div>
      <dl className="a-act-cadence">
        <div>
          <dt>{t("activity.cadence.longest_streak")}</dt>
          <dd>
            {stats.longestStreak > 0
              ? stats.longestStreak === 1
                ? t("activity.kpi.streak_days_one", { count: stats.longestStreak })
                : t("activity.kpi.streak_days_other", { count: stats.longestStreak })
              : t("activity.cadence.none")}
          </dd>
        </div>
        <div>
          <dt>{t("activity.cadence.busiest_day")}</dt>
          <dd>
            {stats.busiestDay
              ? `${stats.busiestDay.label} · ${stats.busiestDay.count}`
              : t("activity.cadence.none")}
          </dd>
        </div>
        <div>
          <dt>{t("activity.cadence.peak_hour")}</dt>
          <dd>{stats.peakHour ? stats.peakHour.label : t("activity.cadence.none")}</dd>
        </div>
        <div>
          <dt>{t("activity.cadence.quietest")}</dt>
          <dd>
            {stats.quietestRepos.length === 0 ? (
              t("activity.cadence.quietest_none")
            ) : (
              <span className="a-act-cad-quiet">
                {stats.quietestRepos.slice(0, 4).map((id) => {
                  const r = reposById.get(id);
                  return (
                    <span key={id} className="a-act-cad-quiet-chip">
                      <span
                        className="a-act-cad-quiet-dot"
                        style={{ background: colorForRepo(id) }}
                      />
                      {r?.name ?? id}
                    </span>
                  );
                })}
                {stats.quietestRepos.length > 4 && (
                  <span className="a-act-cad-quiet-more">+{stats.quietestRepos.length - 4}</span>
                )}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Placeholder list rendered while commits are loading. */
function ActivityListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: 3 }).map((_, day) => (
        <div key={day} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <CommitListSkeleton rows={3} />
        </div>
      ))}
    </div>
  );
}
