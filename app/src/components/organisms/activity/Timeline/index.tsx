import { memo, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  type CheckRunSummary,
  type PrEvent,
  PrEventKind,
  type RecentCommit,
} from "@recrest/shared";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import {
  Chip,
  ChipRow,
  DayCard,
  DayHead,
  DayTitle,
  Empty,
  Feed,
  Pill,
  PillCount,
  Pills,
  ShowMore,
  Wrap,
} from "@/components/organisms/activity/Timeline/Timeline.styles";
import { FeedEventRow } from "@/components/organisms/activity/Timeline/parts/FeedEventRow";
import { type FeedEvent } from "@/components/organisms/activity/Timeline/parts/_shared";
import { ACTIVITY_DAYS, dayLabel, daysAgo } from "@/lib/activityStats";
import { FeedEventKind, FeedFilterKind } from "@/lib/constants/feedEventKinds.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";

// Exported so Storybook's `satisfies Meta<typeof Component>` can name the props
// type through the memo() wrapper (TS4023 otherwise).
export interface Props {
  commits: readonly RecentCommit[];
  prEvents: readonly PrEvent[];
  checkRuns: readonly CheckRunSummary[];
  today: Date;
  reposById: Map<string, EnrichedRepo>;
}

type FilterKind = FeedFilterKind;

// UI-only render budget: a year+ of history can produce thousands of events,
// and rendering every row at once freezes the page. We render whole day-groups
// until the cumulative rendered-row count exceeds this cap, then offer a
// "Show more" button that raises it by another step. Lives locally (not in the
// constants registry) because it is a single render-tuning knob scoped to this
// component with no Rust/domain counterpart.
const TIMELINE_RENDER_CAP = 150;

// Max rows actually painted per day (mirrors the per-day slice below); used so
// the cap counts real DOM rows rather than the full unsliced event totals.
const MAX_ROWS_PER_DAY = 12;

interface DayGroup {
  day: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  checksFailed: number;
  events: FeedEvent[];
}

function Timeline({ commits, prEvents, checkRuns, today, reposById }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterKind>(FeedFilterKind.ALL);
  const [cap, setCap] = useState(TIMELINE_RENDER_CAP);

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
        kind: FeedEventKind.COMMIT,
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
      if (e.kind === PrEventKind.OPENED) g.prsOpened += 1;
      else if (e.kind === PrEventKind.MERGED) g.prsMerged += 1;
      g.events.push({
        kind: FeedEventKind.PR,
        at: e.timestamp,
        repo: reposById.get(e.repoId),
        data: e,
      });
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
      g.events.push({
        kind: FeedEventKind.CHECK,
        at: noonIso,
        repo: reposById.get(s.repoId),
        data: s,
      });
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
    if (filter === FeedFilterKind.ALL) return groups;
    return groups
      .map((g) => ({
        ...g,
        events: g.events.filter((ev) => {
          if (filter === FeedFilterKind.COMMITS) return ev.kind === FeedEventKind.COMMIT;
          if (filter === FeedFilterKind.PRS) return ev.kind === FeedEventKind.PR;
          return ev.kind === FeedEventKind.CHECK;
        }),
      }))
      .filter((g) => g.events.length > 0);
  }, [groups, filter]);

  // Reset the render budget whenever the filter changes — a fresh filter view
  // should start from the initial cap rather than inheriting an expanded one.
  useEffect(() => {
    setCap(TIMELINE_RENDER_CAP);
  }, [filter]);

  // Render whole day-groups while the cumulative painted-row count stays within
  // the cap; always render at least one group. The grouping/totals memos above
  // stay over the full event set so counts and filters remain correct — only
  // the rows committed to the DOM are bounded.
  const { visibleGroups, hiddenCount } = useMemo(() => {
    const visible: DayGroup[] = [];
    let rendered = 0;
    let total = 0;
    let capped = false;
    for (const g of filteredGroups) {
      const rows = Math.min(g.events.length, MAX_ROWS_PER_DAY);
      total += rows;
      // Keep groups contiguous: once a group overflows the cap, stop adding
      // (but keep tallying `total` so hiddenCount stays accurate).
      if (!capped && (visible.length === 0 || rendered + rows <= cap)) {
        visible.push(g);
        rendered += rows;
      } else {
        capped = true;
      }
    }
    return { visibleGroups: visible, hiddenCount: Math.max(0, total - rendered) };
  }, [filteredGroups, cap]);

  const sub = t("activity.timeline.sub", { count: totals.all, days: groups.length });

  const filterChips = (
    <Pills
      value={filter}
      exclusive
      onChange={(_, next: FilterKind | null) => next && setFilter(next)}
      aria-label={t("activity.timeline_filter", { ns: I18nNamespace.ARIA })}
    >
      <Pill value={FeedFilterKind.ALL}>
        <Box component="span">{t("activity.timeline.filter_all")}</Box>
        <PillCount component="span">{totals.all}</PillCount>
      </Pill>
      <Pill value={FeedFilterKind.COMMITS}>
        <Box component="span">{t("activity.timeline.filter_commits")}</Box>
        <PillCount component="span">{totals.commits}</PillCount>
      </Pill>
      <Pill value={FeedFilterKind.PRS}>
        <Box component="span">{t("activity.timeline.filter_prs")}</Box>
        <PillCount component="span">{totals.prs}</PillCount>
      </Pill>
      <Pill value={FeedFilterKind.CHECKS}>
        <Box component="span">{t("activity.timeline.filter_checks")}</Box>
        <PillCount component="span">{totals.checks}</PillCount>
      </Pill>
    </Pills>
  );

  return (
    <GeneralCard
      title={t("activity.timeline.title")}
      sub={sub}
      right={filterChips}
      testId={TEST_IDS.activity.timeline.card}
    >
      {filteredGroups.length === 0 ? (
        <Empty data-testid={TEST_IDS.activity.timeline.empty}>
          {t("activity.timeline.empty_filter")}
        </Empty>
      ) : (
        <Wrap>
          {visibleGroups.map((g) => (
            <DayCard key={g.day} data-testid={TEST_IDS.activity.timeline.day}>
              <DayHead>
                <DayTitle>{dayLabel(g.day)}</DayTitle>
                <ChipRow>
                  {g.commits > 0 &&
                    filter !== FeedFilterKind.PRS &&
                    filter !== FeedFilterKind.CHECKS && (
                      <Chip tone="neutral">
                        {g.commits === 1
                          ? t("activity.timeline.chip_commits_one", { count: g.commits })
                          : t("activity.timeline.chip_commits_other", { count: g.commits })}
                      </Chip>
                    )}
                  {g.prsMerged > 0 &&
                    filter !== FeedFilterKind.COMMITS &&
                    filter !== FeedFilterKind.CHECKS && (
                      <Chip tone="ok">
                        {g.prsMerged === 1
                          ? t("activity.timeline.chip_prs_merged_one", { count: g.prsMerged })
                          : t("activity.timeline.chip_prs_merged_other", { count: g.prsMerged })}
                      </Chip>
                    )}
                  {g.prsOpened > 0 &&
                    filter !== FeedFilterKind.COMMITS &&
                    filter !== FeedFilterKind.CHECKS && (
                      <Chip tone="info">
                        {g.prsOpened === 1
                          ? t("activity.timeline.chip_prs_opened_one", { count: g.prsOpened })
                          : t("activity.timeline.chip_prs_opened_other", { count: g.prsOpened })}
                      </Chip>
                    )}
                  {g.checksFailed > 0 &&
                    filter !== FeedFilterKind.COMMITS &&
                    filter !== FeedFilterKind.PRS && (
                      <Chip tone="err">
                        {g.checksFailed === 1
                          ? `${g.checksFailed} check failed`
                          : `${g.checksFailed} checks failed`}
                      </Chip>
                    )}
                </ChipRow>
              </DayHead>
              <Feed>
                {g.events.slice(0, MAX_ROWS_PER_DAY).map((ev, idx) => (
                  <FeedEventRow key={`${ev.kind}-${idx}`} event={ev} today={today} />
                ))}
              </Feed>
            </DayCard>
          ))}
          {hiddenCount > 0 && (
            <ShowMore>
              <GeneralButton
                variant="outline"
                size="sm"
                data-testid={TEST_IDS.activity.timeline.showMore}
                onClick={() => setCap((c) => c + TIMELINE_RENDER_CAP)}
              >
                {t("activity.timeline.show_more", { count: hiddenCount })}
              </GeneralButton>
            </ShowMore>
          )}
        </Wrap>
      )}
    </GeneralCard>
  );
}

// memo: urgent page re-renders during chunk streaming must not re-layout the timeline.
export default memo(Timeline);
