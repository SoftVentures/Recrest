import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import type { RecentCommit } from "@recrest/shared";

import { RepoAvatar } from "@/components/repos/RepoAvatar";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";

function commitUrl(remote: string | null | undefined, sha: string): string | null {
  if (!remote) return null;
  // Normalise to an HTTPS tree URL. We don't try hard — github / gitlab /
  // bitbucket all follow the same `<host>/<path>/commit/<sha>` convention.
  const https = remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "");
  return `${https}/commit/${sha}`;
}

const ACTIVITY_DAYS = 14;

interface TimelineEntry extends RecentCommit {
  repo: EnrichedRepo | undefined;
  day: number;
  when: string;
}

function dayLabel(d: number): string {
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a number in [0, ACTIVITY_DAYS-1] = days ago, or -1 if outside the window. */
function daysAgo(isoTimestamp: string, today: Date): number {
  const commitDay = startOfLocalDay(new Date(isoTimestamp));
  const diffMs = today.getTime() - commitDay.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0 || days >= ACTIVITY_DAYS) return -1;
  return days;
}

function relativeWhen(isoTimestamp: string, day: number): string {
  if (day === 0) {
    const hoursAgo = Math.max(
      1,
      Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 3_600_000),
    );
    return `${hoursAgo}h ago`;
  }
  return `${day}d ago`;
}

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
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

  const timeline = useMemo(() => {
    const days: { day: number; items: TimelineEntry[] }[] = [];
    for (let d = 0; d < ACTIVITY_DAYS; d++) days.push({ day: d, items: [] });
    for (const c of commits) {
      const day = daysAgo(c.timestamp, today);
      if (day < 0) continue;
      days[day]!.items.push({
        ...c,
        repo: reposById.get(c.repoId),
        day,
        when: relativeWhen(c.timestamp, day),
      });
    }
    return days;
  }, [commits, reposById, today]);

  const authors = useMemo(() => {
    const s = new Set<string>();
    for (const d of timeline) for (const c of d.items) s.add(c.author);
    return [...s];
  }, [timeline]);

  const filtered = useMemo(
    () =>
      timeline
        .map((d) => ({
          day: d.day,
          items: d.items.filter((c) => {
            if (selectedRepo !== "all" && c.repoId !== selectedRepo) return false;
            if (selectedAuthor !== "all" && c.author !== selectedAuthor) return false;
            return true;
          }),
        }))
        .filter((d) => d.items.length > 0),
    [timeline, selectedRepo, selectedAuthor],
  );

  const total = filtered.reduce((s, d) => s + d.items.length, 0);
  const peak = Math.max(1, ...timeline.map((d) => d.items.length));

  return (
    <div className="a-activity">
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
            <select
              className="a-act-select"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
            >
              <option value="all">{t("activity.filter.all_repos")}</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              className="a-act-select"
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
            >
              <option value="all">{t("activity.filter.all_authors")}</option>
              {authors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="a-act-chart">
          {[...timeline].reverse().map((d) => {
            const shown = filtered.find((f) => f.day === d.day);
            const count = shown ? shown.items.length : 0;
            const h = Math.max(4, (count / peak) * 100);
            return (
              <div
                key={d.day}
                className="a-act-chart-col"
                title={`${dayLabel(d.day)} · ${count} commits`}
              >
                <div
                  className="a-act-chart-bar"
                  style={{ height: `${h}%`, opacity: count === 0 ? 0.25 : 1 }}
                />
              </div>
            );
          })}
        </div>
        <div className="a-act-chart-axis">
          <span>14d ago</span>
          <span>7d</span>
          <span>today</span>
        </div>
      </div>

      <div className="a-act-timeline">
        {filtered.map((day) => (
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
        {!loading && filtered.length === 0 && (
          <div className="a-dash-empty">{t("activity.empty")}</div>
        )}
      </div>
    </div>
  );
}
