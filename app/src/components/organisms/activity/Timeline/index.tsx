import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import type { CheckRunSummary, PrEvent, RecentCommit } from "@recrest/shared";

import { Icon, type IconName } from "@/components/atoms/Icon";
import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { CardShell } from "@/components/organisms/activity/cards/CardShell";
import { ACTIVITY_DAYS, dayLabel, daysAgo, relativeWhen } from "@/lib/activityStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";

type FeedEvent =
  | { kind: "commit"; at: string; repo: EnrichedRepo | undefined; data: RecentCommit }
  | { kind: "pr"; at: string; repo: EnrichedRepo | undefined; data: PrEvent }
  | {
      kind: "check";
      at: string;
      repo: EnrichedRepo | undefined;
      data: CheckRunSummary;
    };

type FilterKind = "all" | "commits" | "prs" | "checks";

interface DayGroup {
  day: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  checksFailed: number;
  events: FeedEvent[];
}

interface Props {
  commits: readonly RecentCommit[];
  prEvents: readonly PrEvent[];
  checkRuns: readonly CheckRunSummary[];
  today: Date;
  reposById: Map<string, EnrichedRepo>;
}

function commitUrl(remote: string | null | undefined, sha: string): string | null {
  if (!remote) return null;
  const https = remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "");
  return `${https}/commit/${sha}`;
}

export function Timeline({ commits, prEvents, checkRuns, today, reposById }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterKind>("all");

  const groups = useMemo<DayGroup[]>(() => {
    const buckets: DayGroup[] = Array.from({ length: ACTIVITY_DAYS }, (_, day) => ({
      day,
      commits: 0,
      prsOpened: 0,
      prsMerged: 0,
      checksFailed: 0,
      events: [],
    }));

    for (const c of commits) {
      const d = daysAgo(c.timestamp, today);
      if (d < 0) continue;
      const g = buckets[d];
      if (!g) continue;
      g.commits += 1;
      g.events.push({
        kind: "commit",
        at: c.timestamp,
        repo: reposById.get(c.repoId),
        data: c,
      });
    }

    for (const e of prEvents) {
      const d = daysAgo(e.timestamp, today);
      if (d < 0) continue;
      const g = buckets[d];
      if (!g) continue;
      if (e.kind === "opened") g.prsOpened += 1;
      else if (e.kind === "merged") g.prsMerged += 1;
      g.events.push({ kind: "pr", at: e.timestamp, repo: reposById.get(e.repoId), data: e });
    }

    // Collapse check-run failures to at most one feed row per (repo, day).
    // Multiple failing runs on the same repo/day add to the count but don't
    // spam the feed with duplicate rows.
    const mergedChecks = new Map<string, CheckRunSummary>();
    for (const s of checkRuns) {
      if (s.failed === 0) continue;
      const key = `${s.repoId}::${s.day}`;
      const existing = mergedChecks.get(key);
      if (existing) {
        mergedChecks.set(key, {
          ...existing,
          total: existing.total + s.total,
          passed: existing.passed + s.passed,
          failed: existing.failed + s.failed,
        });
      } else {
        mergedChecks.set(key, { ...s });
      }
    }
    for (const s of mergedChecks.values()) {
      const noonIso = `${s.day}T12:00:00Z`;
      const d = daysAgo(noonIso, today);
      if (d < 0) continue;
      const g = buckets[d];
      if (!g) continue;
      g.checksFailed += s.failed;
      g.events.push({ kind: "check", at: noonIso, repo: reposById.get(s.repoId), data: s });
    }

    for (const g of buckets) {
      g.events.sort((a, b) => (a.at < b.at ? 1 : -1));
    }
    return buckets.filter((g) => g.commits + g.prsOpened + g.prsMerged + g.checksFailed > 0);
  }, [commits, prEvents, checkRuns, today, reposById]);

  const totals = useMemo(() => {
    let cs = 0;
    let prs = 0;
    let ch = 0;
    for (const g of groups) {
      cs += g.commits;
      prs += g.prsOpened + g.prsMerged;
      ch += g.checksFailed;
    }
    return { commits: cs, prs, checks: ch, all: cs + prs + ch };
  }, [groups]);

  const filteredGroups = useMemo<DayGroup[]>(() => {
    if (filter === "all") return groups;
    return groups
      .map((g) => ({
        ...g,
        events: g.events.filter((ev) => {
          if (filter === "commits") return ev.kind === "commit";
          if (filter === "prs") return ev.kind === "pr";
          return ev.kind === "check";
        }),
      }))
      .filter((g) => g.events.length > 0);
  }, [groups, filter]);

  const sub = t("activity.timeline.sub", {
    count: totals.all,
    days: groups.length,
  });

  const filterChips = (
    <div
      className="a-act-tl-filter"
      role="tablist"
      aria-label={t("activity.timeline.filter_label")}
    >
      <FilterPill
        active={filter === "all"}
        label={t("activity.timeline.filter_all")}
        count={totals.all}
        onClick={() => setFilter("all")}
      />
      <FilterPill
        active={filter === "commits"}
        label={t("activity.timeline.filter_commits")}
        count={totals.commits}
        onClick={() => setFilter("commits")}
      />
      <FilterPill
        active={filter === "prs"}
        label={t("activity.timeline.filter_prs")}
        count={totals.prs}
        onClick={() => setFilter("prs")}
      />
      <FilterPill
        active={filter === "checks"}
        label={t("activity.timeline.filter_checks")}
        count={totals.checks}
        onClick={() => setFilter("checks")}
      />
    </div>
  );

  return (
    <CardShell
      title={t("activity.timeline.title")}
      sub={sub}
      className="a-act-tl-card"
      right={filterChips}
    >
      {filteredGroups.length === 0 ? (
        <div className="a-act-card-empty" data-testid="activity-timeline-empty">
          {t("activity.timeline.empty_filter")}
        </div>
      ) : (
        <div className="a-act-timeline">
          {filteredGroups.map((g) => (
            <div key={g.day} className="a-act-day-card" data-testid="activity-timeline-day">
              <div className="a-act-day-card-h">
                <div className="a-act-day-card-title">{dayLabel(g.day)}</div>
                <div className="a-act-day-card-chips">
                  {g.commits > 0 && filter !== "prs" && filter !== "checks" && (
                    <span className="a-act-day-chip">
                      {g.commits === 1
                        ? t("activity.timeline.chip_commits_one", { count: g.commits })
                        : t("activity.timeline.chip_commits_other", { count: g.commits })}
                    </span>
                  )}
                  {g.prsMerged > 0 && filter !== "commits" && filter !== "checks" && (
                    <span className="a-act-day-chip ok">
                      {g.prsMerged === 1
                        ? t("activity.timeline.chip_prs_merged_one", { count: g.prsMerged })
                        : t("activity.timeline.chip_prs_merged_other", { count: g.prsMerged })}
                    </span>
                  )}
                  {g.prsOpened > 0 && filter !== "commits" && filter !== "checks" && (
                    <span className="a-act-day-chip info">
                      {g.prsOpened === 1
                        ? t("activity.timeline.chip_prs_opened_one", { count: g.prsOpened })
                        : t("activity.timeline.chip_prs_opened_other", { count: g.prsOpened })}
                    </span>
                  )}
                  {g.checksFailed > 0 && filter !== "commits" && filter !== "prs" && (
                    <span className="a-act-day-chip err">
                      {g.checksFailed === 1
                        ? t("activity.timeline.chip_checks_failed_one", { count: g.checksFailed })
                        : t("activity.timeline.chip_checks_failed_other", {
                            count: g.checksFailed,
                          })}
                    </span>
                  )}
                </div>
              </div>
              <div className="a-act-feed">
                {g.events.slice(0, 12).map((ev, idx) => (
                  <FeedRow key={`${ev.kind}-${idx}`} event={ev} today={today} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

interface FilterPillProps {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}

function FilterPill({ active, label, count, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active ? "true" : "false"}
      className={`a-act-tl-pill${active ? " active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="a-act-tl-pill-count">{count}</span>
    </button>
  );
}

function FeedRow({ event, today }: { event: FeedEvent; today: Date }) {
  const day = daysAgo(event.at, today);
  const when = day >= 0 ? relativeWhen(event.at, day) : "";

  if (event.kind === "commit") {
    const url = commitUrl(event.repo?.remoteUrl, event.data.sha);
    const open = () => {
      if (url) void openExternal(url);
      else toast.info("No remote URL for this commit");
    };
    return (
      <Row
        iconName="git"
        iconClass="commit"
        onOpen={open}
        cursor={url ? "pointer" : "default"}
        avatar={<AuthorAvatar name={event.data.author} email={event.data.authorEmail} size={20} />}
        message={event.data.summary}
        repo={event.repo}
        repoName={event.data.repoName}
        extra={event.data.sha.slice(0, 7)}
        when={when}
      />
    );
  }

  if (event.kind === "pr") {
    const e = event.data;
    const open = () => void openExternal(e.url);
    return (
      <Row
        iconName="pr"
        iconClass={e.kind}
        onOpen={open}
        cursor="pointer"
        avatar={<AuthorAvatar name={e.author} size={20} />}
        message={`${e.kind.toUpperCase()} · ${e.title}`}
        repo={event.repo}
        repoName={e.repoName}
        extra={`#${e.number}`}
        when={when}
      />
    );
  }

  const s = event.data;
  const failedLabel = s.failed === 1 ? "1 failing check" : `${s.failed} failing checks`;
  return (
    <Row
      iconName="ci"
      iconClass={s.failed > 0 ? "check-fail" : "check-ok"}
      onOpen={null}
      cursor="default"
      avatar={null}
      message={`${failedLabel} · ${s.passed} passing`}
      repo={event.repo}
      repoName={s.repoName}
      extra=""
      when={when}
    />
  );
}

interface RowProps {
  iconName: IconName;
  iconClass: string;
  onOpen: (() => void) | null;
  cursor: "pointer" | "default";
  avatar: React.ReactNode;
  message: string;
  repo: EnrichedRepo | undefined;
  repoName: string;
  extra: string;
  when: string;
}

function Row({
  iconName,
  iconClass,
  onOpen,
  cursor,
  avatar,
  message,
  repo,
  repoName,
  extra,
  when,
}: RowProps) {
  return (
    <div
      className="a-act-feed-item"
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : -1}
      onClick={onOpen ?? undefined}
      onKeyDown={(e) => {
        if (!onOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{ cursor }}
    >
      <span className={`a-act-feed-kind ${iconClass}`}>
        <Icon name={iconName} size={14} />
      </span>
      <span>{avatar}</span>
      <span className="a-act-feed-msg">{message}</span>
      <span className="a-act-feed-meta">
        {repo && <RepoAvatar repo={repo} size={14} radius={3} />}
        <span>{repoName}</span>
        {extra && <span>· {extra}</span>}
        <span className="a-act-feed-when">· {when}</span>
      </span>
    </div>
  );
}
