import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Collapse } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PrState } from "@recrest/shared";
import type { PullRequest } from "@recrest/shared";

import { ChevronDown, Filter } from "lucide-react";

import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { MrDetailPanel } from "@/pages/app/MergeRequests/components/MrDetailPanel";
import MrFiltersPopover, {
  type AuthorOption,
  type RepoOption,
} from "@/pages/app/MergeRequests/parts/MrFiltersPopover";
import MrGroup from "@/pages/app/MergeRequests/parts/MrGroup";
import {
  EMPTY_MR_FILTERS,
  type MrFiltersState,
  activeMrFilterCount,
  applyMrFilters,
} from "@/pages/app/MergeRequests/utils/mrFilters";
import { detailKey, loadPrDetail, loadPrDiff } from "@/store/actions/prs.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface Row {
  pr: PullRequest;
  repoId: string;
  repoName: string;
}

interface Group {
  repoId: string;
  repoName: string;
  rows: Row[];
}

// Flex row so the detail pane sits beside the list and pushes it left (a
// "push" drawer, mirroring the Repositories page) instead of overlaying it.
// `containerType` makes the pane's width ladder below query the *layout* width:
// `#root` carries `zoom: var(--ui-scale)`, and a `@media` px threshold reports
// the unscaled viewport, so it fires at the wrong moment on scaled setups.
const PageRoot = styled(Box)({
  display: "flex",
  height: "100%",
  minHeight: 0,
  containerType: "inline-size",
});

const MainColumn = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
});

// Fixed-width side pane. `flexShrink: 0` keeps it from collapsing; the list
// column shrinks to make room (the push behaviour). The MrDetailPanel inside
// owns its own scroll + opaque background.
//
// The width ladder steps down twice so a narrow window hands space back to the
// list instead of squeezing it: pure flex shrinking cannot help here (both
// columns want width at the same time, so there is no slack to redistribute) —
// only a smaller pane frees real estate. 280px is the floor at which the
// panel's own header row still fits.
const Pane = styled(Box)(({ theme }) => ({
  width: 400,
  height: "100%",
  flexShrink: 0,
  borderLeft: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
  "@container (max-width: 1180px)": {
    width: 340,
  },
  "@container (max-width: 1040px)": {
    width: 280,
  },
})) as typeof Box;

// `Collapse` (horizontal) is the flex item that animates the list making room;
// pin its shrink so the list column — not the pane — gives up the width.
const PaneCollapse = styled(Collapse)({
  flexShrink: 0,
  height: "100%",
  // Horizontal Collapse animates width; force its inner wrappers to full height
  // so the pane fills the column instead of collapsing vertically.
  "& .MuiCollapse-wrapper, & .MuiCollapse-wrapperInner": {
    height: "100%",
  },
});

const Toolbar = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  // The filter button drops below the search field rather than overflowing the
  // page when the layout width (or the UI scale) squeezes them.
  flexWrap: "wrap",
  rowGap: 8,
  padding: "12px 24px 12px 24px",
  paddingRight: "calc(24px + var(--recrest-scrollbar-width, 0px))",
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
});

// eslint-disable-next-line no-restricted-syntax -- native <button> required: must own the anchor ref for the filter Popover (MUI accepts only a DOM element ref). A wrapping Box or a regular MUI Button would change focus/keyboard semantics for what is structurally a toggle.
const FilterBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 30,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));

const FilterBadge = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 5px",
  borderRadius: 8,
  fontSize: 10,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText ?? "#fff",
})) as typeof Box;

const Card = styled(Box)(({ theme }) => ({
  margin: theme.spacing(0, 3),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.surface.interface.base,
  overflow: "hidden",
}));

const Scroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  scrollbarGutter: "stable",
  paddingBottom: 24,
});

export default function MergeRequestsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);
  const connections = useAppSelector((s) => s.providers.connections);
  const cachedDiffs = useAppSelector((s) => s.prs.diff);
  const cachedDetails = useAppSelector((s) => s.prs.detail);
  const diffsLoading = useAppSelector((s) => s.prs.diffLoading);
  const detailsLoading = useAppSelector((s) => s.prs.detailLoading);

  const [filter, setFilter] = useState("");
  const [filters, setFilters] = useState<MrFiltersState>(EMPTY_MR_FILTERS);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);

  // Single source of truth — every open MR the user could possibly see on
  // this page before any search/filter narrowing. Filter-popover options are
  // derived from this so toggling a filter doesn't make its own option
  // disappear (a common GitHub/Linear UX gotcha).
  const allRows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const [repoId, prs] of Object.entries(items)) {
      const repo = repos[repoId];
      if (!repo || !repo.providerId) continue;
      if (!connections[repo.providerId]?.connected) continue;
      for (const pr of prs) {
        if (pr.state !== PrState.OPEN) continue;
        out.push({ pr, repoId, repoName: repo.name });
      }
    }
    return out;
  }, [items, repos, connections]);

  // Preload diff + detail for every visible MR so:
  //   1) Rows can show +/− stats even when the provider list endpoint omits
  //      them (GitLab) — derived from the cached diff via deriveDiffStats
  //   2) Opening the drawer / detail page reveals data instantly instead of
  //      flashing a loading state
  // Dispatch is idempotent — guard against re-dispatching when the slice
  // already has the data or a request is in flight.
  useEffect(() => {
    if (!isTauri()) return;
    for (const row of allRows) {
      const key = detailKey(row.repoId, row.pr.number);
      if (!cachedDiffs[key] && !diffsLoading[key]) {
        void dispatch(loadPrDiff({ repoId: row.repoId, prNumber: row.pr.number }));
      }
      if (!cachedDetails[key] && !detailsLoading[key]) {
        void dispatch(loadPrDetail({ repoId: row.repoId, prNumber: row.pr.number }));
      }
    }
  }, [allRows, cachedDiffs, cachedDetails, diffsLoading, detailsLoading, dispatch]);

  const repoOptions = useMemo<RepoOption[]>(() => {
    const map = new Map<string, RepoOption>();
    for (const r of allRows) {
      const existing = map.get(r.repoId);
      if (existing) {
        existing.count += 1;
      } else {
        const repo = repos[r.repoId];
        map.set(r.repoId, {
          id: r.repoId,
          name: r.repoName,
          count: 1,
          logoPath: repo?.logoPath ?? null,
          logoDarkPath: repo?.logoDarkPath ?? null,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows, repos]);

  const authorOptions = useMemo<AuthorOption[]>(() => {
    const map = new Map<string, AuthorOption>();
    for (const r of allRows) {
      const login = r.pr.author;
      const existing = map.get(login);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(login, { login, count: 1, avatarUrl: r.pr.authorAvatarUrl ?? null });
      }
    }
    return [...map.values()].sort((a, b) => a.login.localeCompare(b.login));
  }, [allRows]);

  const hasDrafts = useMemo(() => allRows.some((r) => r.pr.draft), [allRows]);

  const visibleRows = useMemo<Row[]>(() => {
    let out = applyMrFilters(allRows, filters);
    const q = filter.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.pr.title.toLowerCase().includes(q) ||
          r.repoName.toLowerCase().includes(q) ||
          r.pr.author.toLowerCase().includes(q),
      );
    }
    return out;
  }, [allRows, filters, filter]);

  const groups = useMemo<Group[]>(() => {
    const byRepo = new Map<string, Group>();
    for (const r of visibleRows) {
      const g = byRepo.get(r.repoId);
      if (g) g.rows.push(r);
      else byRepo.set(r.repoId, { repoId: r.repoId, repoName: r.repoName, rows: [r] });
    }
    return [...byRepo.values()].sort((a, b) => a.repoName.localeCompare(b.repoName));
  }, [visibleRows]);

  // Per-repo collapse state — store *collapsed* IDs so newly appearing groups
  // default to expanded (matching the Repos page's `useState(true)` default).
  const [collapsedRepoIds, setCollapsedRepoIds] = useState<Set<string>>(new Set());
  const toggleGroup = (repoId: string) => {
    setCollapsedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  };

  const [selected, setSelected] = useState<Row | null>(null);
  // `shownRow` keeps the panel content mounted through the close animation so
  // it doesn't vanish before the pane finishes collapsing. Set synchronously
  // with `selected` on open (so the Collapse enter transition has content to
  // animate); cleared in the Collapse `onExited` once the slide-out completes.
  const [shownRow, setShownRow] = useState<Row | null>(null);

  const isSameRow = (a: Row | null, b: Row) =>
    !!a && a.repoId === b.repoId && a.pr.number === b.pr.number;

  const handleSelectRow = (row: Row) => {
    if (isSameRow(selected, row)) {
      setSelected(null); // re-click closes; onExited clears shownRow
    } else {
      setShownRow(row);
      setSelected(row);
    }
  };

  const activeCount = activeMrFilterCount(filters);

  return (
    <PageRoot data-testid={TEST_IDS.mr.page}>
      <MainColumn>
        <Toolbar>
          <GeneralSearchInput
            value={filter}
            onChange={setFilter}
            placeholder={t("mrs.filter_placeholder")}
            aria-label={t("search.input", { ns: I18nNamespace.ARIA })}
            clearLabel={t("search.clear", { ns: I18nNamespace.ARIA })}
            data-testid={TEST_IDS.mr.filterInput}
            clearTestId={TEST_IDS.mr.filterClear}
          />
          <FilterBtn
            ref={filterBtnRef}
            type="button"
            onClick={() => setPopoverOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={popoverOpen}
            data-testid={TEST_IDS.mr.filterBtn}
          >
            <Filter size={13} />
            {t("mrs.filters")}
            {activeCount > 0 && (
              <FilterBadge component="span" data-testid={TEST_IDS.mr.filterBadge}>
                {activeCount}
              </FilterBadge>
            )}
            <ChevronDown size={13} />
          </FilterBtn>
        </Toolbar>

        <Scroll>
          {allRows.length === 0 ? (
            <EmptyState
              mascot="snoozing"
              title={t("empty_states.none_title", { ns: I18nNamespace.PRS })}
              description={t("empty_states.none_description", { ns: I18nNamespace.PRS })}
            />
          ) : visibleRows.length === 0 ? (
            <EmptyState
              mascot="shrugging"
              title={t("empty_states.no_match_title", { ns: I18nNamespace.PRS })}
              description={t("empty_states.no_match_description", { ns: I18nNamespace.PRS })}
            />
          ) : (
            <Card>
              {groups.map((g) => (
                <MrGroup
                  key={g.repoId}
                  repoId={g.repoId}
                  repoName={g.repoName}
                  prs={g.rows}
                  collapsed={collapsedRepoIds.has(g.repoId)}
                  selectedKey={selected ? `${selected.repoId}#${selected.pr.number}` : null}
                  onToggle={() => toggleGroup(g.repoId)}
                  onSelectRow={handleSelectRow}
                />
              ))}
            </Card>
          )}
        </Scroll>
      </MainColumn>

      <PaneCollapse
        in={!!selected}
        orientation="horizontal"
        timeout={PAGE_DUR_SM}
        unmountOnExit
        onExited={() => setShownRow(null)}
      >
        {shownRow && (
          <Pane>
            <MrDetailPanel
              pr={shownRow.pr}
              repoId={shownRow.repoId}
              repoName={shownRow.repoName}
              onClose={() => setSelected(null)}
            />
          </Pane>
        )}
      </PaneCollapse>

      <MrFiltersPopover
        open={popoverOpen}
        anchorEl={filterBtnRef.current}
        filters={filters}
        onChange={setFilters}
        onClose={() => setPopoverOpen(false)}
        repos={repoOptions}
        authors={authorOptions}
        hasDrafts={hasDrafts}
      />
    </PageRoot>
  );
}
