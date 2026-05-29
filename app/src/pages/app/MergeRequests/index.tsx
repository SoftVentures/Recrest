import { useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PrState } from "@recrest/shared";
import type { PullRequest } from "@recrest/shared";

import { ChevronDown, Filter } from "lucide-react";

import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import MrDetailDrawer from "@/components/molecules/drawers/MrDetailDrawer";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import { useDrawerSwipe } from "@/hooks/useDrawerSwipe";
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
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
import { useAppSelector } from "@/store/hooks";

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

const Root = styled(Box)({
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});

const Toolbar = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
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
  const items = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);
  const connections = useAppSelector((s) => s.providers.connections);

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
  const drawerRef = useRef<HTMLDivElement | null>(null);
  useDrawerSwipe({
    ref: drawerRef,
    enabled: !!selected,
    onClose: () => setSelected(null),
    direction: "right",
  });

  const activeCount = activeMrFilterCount(filters);

  return (
    <Root data-testid={TEST_IDS.mr.page}>
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
            title="No open merge requests"
            description="Connected providers haven't returned any open PRs yet."
          />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            mascot="shrugging"
            title="No merge requests match"
            description="Try clearing the search or relaxing your filters."
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
                onToggle={() => toggleGroup(g.repoId)}
                onSelectRow={(row) => setSelected(row)}
              />
            ))}
          </Card>
        )}
      </Scroll>

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

      <MrDetailDrawer
        pr={selected?.pr ?? null}
        repoId={selected?.repoId ?? ""}
        repoName={selected?.repoName}
        bodyRef={drawerRef}
        onClose={() => setSelected(null)}
      />
    </Root>
  );
}
