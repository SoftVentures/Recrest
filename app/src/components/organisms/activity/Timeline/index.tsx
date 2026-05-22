import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { CheckRunSummary, PrEvent, RecentCommit } from "@recrest/shared";

import { GitCommit, GitMerge, GitPullRequest, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import GeneralAuthorAvatar from "@/components/molecules/avatars/GeneralAuthorAvatar";
import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import GeneralCard from "@/components/molecules/cards/GeneralCard";
import { ACTIVITY_DAYS, dayLabel, daysAgo, relativeWhen } from "@/lib/activityStats";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { openExternal } from "@/lib/tauri";

interface Props {
  commits: readonly RecentCommit[];
  prEvents: readonly PrEvent[];
  checkRuns: readonly CheckRunSummary[];
  today: Date;
  reposById: Map<string, EnrichedRepo>;
}

type FeedEvent =
  | { kind: "commit"; at: string; repo: EnrichedRepo | undefined; data: RecentCommit }
  | { kind: "pr"; at: string; repo: EnrichedRepo | undefined; data: PrEvent }
  | { kind: "check"; at: string; repo: EnrichedRepo | undefined; data: CheckRunSummary };

type FilterKind = "all" | "commits" | "prs" | "checks";

interface DayGroup {
  day: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  checksFailed: number;
  events: FeedEvent[];
}

function commitUrl(remote: string | null | undefined, sha: string): string | null {
  if (!remote) return null;
  const https = remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "");
  return `${https}/commit/${sha}`;
}

const Pills = styled(ToggleButtonGroup)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 999,
  padding: 3,
  gap: 2,
  "& .MuiToggleButtonGroup-grouped": {
    border: 0,
    margin: 0,
    "&:not(:first-of-type)": { marginLeft: 0, borderLeft: 0 },
  },
}));

const Pill = styled(ToggleButton)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 24,
  padding: "0 10px",
  border: 0,
  background: "transparent",
  color: theme.palette.text.secondary,
  fontFamily: "inherit",
  fontSize: 11.5,
  fontWeight: 500,
  borderRadius: 999,
  textTransform: "none",
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: "rgba(17, 17, 22, 0.05)",
  },
  "&.Mui-selected": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.surface.interface.base,
    boxShadow: `0 0 0 1px ${theme.palette.border.default}, 0 1px 2px rgba(0, 0, 0, 0.06)`,
  },
  "&.Mui-selected:hover": {
    backgroundColor: theme.palette.surface.interface.base,
  },
}));

const PillCount = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 14,
  padding: "0 4px",
  borderRadius: 999,
  fontSize: 9.5,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  backgroundColor: theme.palette.surface.interface.backElevation,
  color: theme.palette.text.information,
  ".Mui-selected &": {
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    color: theme.palette.primary.dark,
  },
}));

const Wrap = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const DayCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
}));

const DayHead = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
});

const DayTitle = styled("div")(({ theme }) => ({
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: theme.palette.text.primary,
}));

const ChipRow = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
});

const Chip = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "neutral" | "ok" | "info" | "err";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 10,
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: 100,
  ...(tone === "ok" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.success.main} 16%, transparent)`,
    color: theme.palette.success.dark,
  }),
  ...(tone === "info" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    color: theme.palette.primary.dark,
  }),
  ...(tone === "err" && {
    backgroundColor: `color-mix(in srgb, ${theme.palette.error.main} 16%, transparent)`,
    color: theme.palette.error.dark,
  }),
  ...(tone === "neutral" && {
    backgroundColor: theme.palette.surface.interface.base,
    color: theme.palette.text.secondary,
  }),
}));

const Feed = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
}));

const FeedItem = styled("div", { shouldForwardProp: (p) => p !== "clickable" })<{
  clickable?: boolean;
}>(({ theme, clickable }) => ({
  display: "grid",
  gridTemplateColumns: "22px 24px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: clickable ? "pointer" : "default",
  "&:last-of-type": { borderBottom: 0 },
  "&:hover": {
    backgroundColor: clickable ? theme.palette.surface.interface.active : "transparent",
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}));

const FeedIcon = styled("span", { shouldForwardProp: (p) => p !== "tone" })<{
  tone: "commit" | "opened" | "merged" | "closed" | "check-ok" | "check-fail";
}>(({ theme, tone }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: "50%",
  flexShrink: 0,
  color:
    tone === "commit"
      ? theme.palette.text.information
      : tone === "opened"
        ? theme.palette.primary.main
        : tone === "merged"
          ? theme.palette.success.main
          : tone === "check-ok"
            ? theme.palette.success.main
            : tone === "check-fail"
              ? theme.palette.error.main
              : theme.palette.text.information,
  backgroundColor:
    tone === "commit"
      ? theme.palette.surface.interface.backElevation
      : tone === "opened"
        ? `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`
        : tone === "merged"
          ? `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`
          : tone === "check-ok"
            ? `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`
            : tone === "check-fail"
              ? `color-mix(in srgb, ${theme.palette.error.main} 14%, transparent)`
              : theme.palette.surface.interface.backElevation,
}));

const FeedMsg = styled("span")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.primary,
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
}));

const FeedMeta = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: theme.palette.text.information,
  flexShrink: 0,
  whiteSpace: "nowrap",
}));

const Empty = styled(Box)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "16px 0",
  textAlign: "center",
}));

function Timeline({ commits, prEvents, checkRuns, today, reposById }: Props) {
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
      g.events.push({ kind: "commit", at: c.timestamp, repo: reposById.get(c.repoId), data: c });
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
    defaultValue: `${totals.all} events across ${groups.length} days`,
  });

  const filterChips = (
    <Pills
      value={filter}
      exclusive
      onChange={(_, next: FilterKind | null) => next && setFilter(next)}
      aria-label={t("activity.timeline.filter_label", { defaultValue: "Event type" })}
    >
      <Pill value="all">
        <span>{t("activity.timeline.filter_all", { defaultValue: "All" })}</span>
        <PillCount>{totals.all}</PillCount>
      </Pill>
      <Pill value="commits">
        <span>{t("activity.timeline.filter_commits", { defaultValue: "Commits" })}</span>
        <PillCount>{totals.commits}</PillCount>
      </Pill>
      <Pill value="prs">
        <span>{t("activity.timeline.filter_prs", { defaultValue: "Merge requests" })}</span>
        <PillCount>{totals.prs}</PillCount>
      </Pill>
      <Pill value="checks">
        <span>{t("activity.timeline.filter_checks", { defaultValue: "CI checks" })}</span>
        <PillCount>{totals.checks}</PillCount>
      </Pill>
    </Pills>
  );

  return (
    <GeneralCard
      title={t("activity.timeline.title", { defaultValue: "History" })}
      sub={sub}
      right={filterChips}
      testId="activity-timeline-card"
    >
      {filteredGroups.length === 0 ? (
        <Empty data-testid="activity-timeline-empty">
          {t("activity.timeline.empty_filter", { defaultValue: "No events match this filter." })}
        </Empty>
      ) : (
        <Wrap>
          {filteredGroups.map((g) => (
            <DayCard key={g.day} data-testid="activity-timeline-day">
              <DayHead>
                <DayTitle>{dayLabel(g.day)}</DayTitle>
                <ChipRow>
                  {g.commits > 0 && filter !== "prs" && filter !== "checks" && (
                    <Chip tone="neutral">
                      {g.commits === 1
                        ? t("activity.timeline.chip_commits_one", {
                            count: g.commits,
                            defaultValue: `${g.commits} commit`,
                          })
                        : t("activity.timeline.chip_commits_other", {
                            count: g.commits,
                            defaultValue: `${g.commits} commits`,
                          })}
                    </Chip>
                  )}
                  {g.prsMerged > 0 && filter !== "commits" && filter !== "checks" && (
                    <Chip tone="ok">
                      {g.prsMerged === 1
                        ? t("activity.timeline.chip_prs_merged_one", {
                            count: g.prsMerged,
                            defaultValue: `${g.prsMerged} MR merged`,
                          })
                        : t("activity.timeline.chip_prs_merged_other", {
                            count: g.prsMerged,
                            defaultValue: `${g.prsMerged} MRs merged`,
                          })}
                    </Chip>
                  )}
                  {g.prsOpened > 0 && filter !== "commits" && filter !== "checks" && (
                    <Chip tone="info">
                      {g.prsOpened === 1
                        ? t("activity.timeline.chip_prs_opened_one", {
                            count: g.prsOpened,
                            defaultValue: `${g.prsOpened} MR opened`,
                          })
                        : t("activity.timeline.chip_prs_opened_other", {
                            count: g.prsOpened,
                            defaultValue: `${g.prsOpened} MRs opened`,
                          })}
                    </Chip>
                  )}
                  {g.checksFailed > 0 && filter !== "commits" && filter !== "prs" && (
                    <Chip tone="err">
                      {g.checksFailed === 1
                        ? `${g.checksFailed} check failed`
                        : `${g.checksFailed} checks failed`}
                    </Chip>
                  )}
                </ChipRow>
              </DayHead>
              <Feed>
                {g.events.slice(0, 12).map((ev, idx) => (
                  <FeedEventRow key={`${ev.kind}-${idx}`} event={ev} today={today} />
                ))}
              </Feed>
            </DayCard>
          ))}
        </Wrap>
      )}
    </GeneralCard>
  );
}

interface FeedEventRowProps {
  event: FeedEvent;
  today: Date;
}

function FeedEventRow({ event, today }: FeedEventRowProps) {
  const day = daysAgo(event.at, today);
  const when = day >= 0 ? relativeWhen(event.at, day) : "";

  if (event.kind === "commit") {
    const url = commitUrl(event.repo?.remoteUrl, event.data.sha);
    const open = () => {
      if (url) void openExternal(url);
      else toast.info("No remote URL for this commit");
    };
    return (
      <FeedItem
        clickable
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
      >
        <FeedIcon tone="commit">
          <GitCommit size={13} aria-hidden />
        </FeedIcon>
        <GeneralAuthorAvatar
          name={event.data.author}
          email={event.data.authorEmail ?? undefined}
          size={20}
        />
        <FeedMsg>{event.data.summary}</FeedMsg>
        <FeedMeta>
          {event.repo && <GeneralRepoAvatar repo={event.repo} size={14} radius={3} />}
          <span>{event.data.repoName}</span>
          <span>· {event.data.sha.slice(0, 7)}</span>
          <span>· {when}</span>
        </FeedMeta>
      </FeedItem>
    );
  }

  if (event.kind === "pr") {
    const e = event.data;
    const open = () => void openExternal(e.url);
    const tone: "opened" | "merged" | "closed" =
      e.kind === "opened" ? "opened" : e.kind === "merged" ? "merged" : "closed";
    const Icon = e.kind === "merged" ? GitMerge : GitPullRequest;
    return (
      <FeedItem
        clickable
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            open();
          }
        }}
      >
        <FeedIcon tone={tone}>
          <Icon size={13} aria-hidden />
        </FeedIcon>
        <GeneralAuthorAvatar name={e.author} size={20} />
        <FeedMsg>
          {e.kind.toUpperCase()} · {e.title}
        </FeedMsg>
        <FeedMeta>
          {event.repo && <GeneralRepoAvatar repo={event.repo} size={14} radius={3} />}
          <span>{e.repoName}</span>
          <span>· #{e.number}</span>
          <span>· {when}</span>
        </FeedMeta>
      </FeedItem>
    );
  }

  const s = event.data;
  const failingTone: "check-ok" | "check-fail" = s.failed > 0 ? "check-fail" : "check-ok";
  const Icon = s.failed > 0 ? ShieldAlert : ShieldCheck;
  const failedLabel = s.failed === 1 ? "1 failing check" : `${s.failed} failing checks`;
  return (
    <FeedItem>
      <FeedIcon tone={failingTone}>
        <Icon size={13} aria-hidden />
      </FeedIcon>
      <Box />
      <FeedMsg>
        {failedLabel} · {s.passed} passing
      </FeedMsg>
      <FeedMeta>
        {event.repo && <GeneralRepoAvatar repo={event.repo} size={14} radius={3} />}
        <span>{s.repoName}</span>
        <span>· {when}</span>
      </FeedMeta>
    </FeedItem>
  );
}

export default Timeline;
