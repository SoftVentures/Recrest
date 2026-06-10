import { useMemo, useState } from "react";

import { useParams } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Filter,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";

import GeneralButtonGroup, {
  GeneralButtonGroupItem,
} from "@/components/atoms/buttons/GeneralButtonGroup";
import { useRangeActivity } from "@/hooks/useActivityCommits";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import type { RepoSortKey } from "@/lib/constants/sortKeys.constants";
import type { RepoStatusChip } from "@/lib/constants/statusChips.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import {
  type RepoView,
  lastCommitTime,
  sortKeyFromBackend,
  sortKeyToBackend,
  statusRank,
  viewFromBackend,
  viewToBackend,
} from "@/lib/utils/repoSort.utils";
import { RepoActivitySeriesProvider } from "@/pages/app/Repos/RepoActivityContext";
import {
  FilterBadge,
  FilterButton,
  FilterMenu,
  ListScroll,
  MainColumn,
  MenuSeparator,
  PageRoot,
  SectionLabel,
  ToolbarRow,
} from "@/pages/app/Repos/Repos.styles";
import { DetailPane } from "@/pages/app/Repos/components/DetailPane";
import { RepoList } from "@/pages/app/Repos/components/RepoList";
import { ChipItem } from "@/pages/app/Repos/parts/ChipItem";
import { saveSettings } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface ReposPageProps {
  dirtyOnly?: boolean;
}

interface SortOption {
  key: RepoSortKey;
  labelKey: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "default", labelKey: "toolbar.sort_default" },
  { key: "name:asc", labelKey: "toolbar.sort_name_asc" },
  { key: "name:desc", labelKey: "toolbar.sort_name_desc" },
  { key: "lastModified:desc", labelKey: "toolbar.sort_recently_modified" },
  { key: "status:asc", labelKey: "toolbar.sort_status" },
];

export default function ReposPage({ dirtyOnly }: ReposPageProps = {}) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const { t: tCommon } = useTranslation(I18nNamespace.COMMON);
  const { t } = useTranslation(I18nNamespace.REPOS);
  const enriched = useEnrichedRepos();
  const { byRepo: activityByRepo } = useRangeActivity();
  const dispatch = useAppDispatch();
  const backend = useAppSelector((s) => s.settings.backend);
  const { repoId } = useParams<{ repoId?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(repoId ?? null);
  const [view, setView] = useState<RepoView>(() =>
    backend ? viewFromBackend(backend.repoListViewMode) : "list",
  );
  const [statusChips, setStatusChips] = useState<Set<RepoStatusChip>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<RepoSortKey>(() =>
    backend ? sortKeyFromBackend(backend.repoListSort) : "default",
  );

  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  const persistList = (nextView: RepoView, nextSort: RepoSortKey) => {
    void dispatch(
      saveSettings({
        repoListViewMode: viewToBackend(nextView, nextSort),
        repoListSort: sortKeyToBackend(nextSort),
      }),
    );
  };

  const handleView = (nextView: RepoView) => {
    setView(nextView);
    persistList(nextView, sort);
  };

  const handleSort = (nextSort: RepoSortKey) => {
    setSort(nextSort);
    persistList(view, nextSort);
  };

  // Distinct group labels present in the (already-enriched) repo list.
  // Sorted by `localeCompare` so the menu order is stable across re-renders.
  const groupOptions = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const r of enriched) seen.add(r.group);
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  const repos = useMemo<EnrichedRepo[]>(() => {
    let out = dirtyOnly ? enriched.filter((r) => r.status.dirty) : enriched;
    if (groupFilter !== null) out = out.filter((r) => r.group === groupFilter);
    if (statusChips.size > 0) {
      out = out.filter((r) => {
        for (const chip of statusChips) {
          if (chip === "dirty" && !r.status.dirty) return false;
          if (chip === "clean" && r.status.dirty) return false;
          if (chip === "ahead" && r.status.ahead === 0) return false;
          if (chip === "behind" && r.status.behind === 0) return false;
        }
        return true;
      });
    }
    // `default` = grouped view with alphabetical order inside each group.
    // Without an explicit sort the user expects a predictable A→Z layout,
    // not whatever insertion order Redux happens to have.
    if (sort === "default" || sort === "name:asc")
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "name:desc") out = [...out].sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "lastModified:desc")
      out = [...out].sort((a, b) => lastCommitTime(b) - lastCommitTime(a));
    else if (sort === "status:asc") out = [...out].sort((a, b) => statusRank(a) - statusRank(b));

    // Pinned repos always bubble to the top — applied last so it overrides
    // whichever sort key the user picked. JS's Array.sort is stable, so the
    // alphabetical order survives within both the pinned and the unpinned
    // subsets. The downstream group-by preserves relative order within a
    // category, so pinned items land at the top of their own group.
    out = [...out].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    return out;
  }, [enriched, dirtyOnly, groupFilter, statusChips, sort]);

  const grouped = sort === "default";

  const selected = selectedId ? enriched.find((r) => r.id === selectedId) : null;

  const toggleChip = (chip: RepoStatusChip) => {
    setStatusChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  };

  const activeFilterCount =
    statusChips.size + (sort === "default" ? 0 : 1) + (groupFilter !== null ? 1 : 0);

  return (
    <PageRoot data-testid={dirtyOnly ? "changes-page" : "repos-page"}>
      <MainColumn>
        <ToolbarRow data-testid={TEST_IDS.repos.toolbar}>
          <GeneralButtonGroup
            value={view}
            exclusive
            density="xs"
            onChange={(_, v: RepoView | null) => v && handleView(v)}
            aria-label={tAria("repo.view_toggle")}
          >
            <GeneralButtonGroupItem value="list" data-testid={TEST_IDS.repos.viewToggle.grouped}>
              <ListIcon size={14} aria-hidden style={{ marginRight: 6 }} />
              {t("toolbar.view_default")}
            </GeneralButtonGroupItem>
            <GeneralButtonGroupItem value="card" data-testid={TEST_IDS.repos.viewToggle.card}>
              <LayoutGrid size={14} aria-hidden style={{ marginRight: 6 }} />
              {t("toolbar.view_cards")}
            </GeneralButtonGroupItem>
          </GeneralButtonGroup>

          <FilterButton
            type="button"
            data-testid={TEST_IDS.repos.filterTrigger}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            data-active={activeFilterCount > 0 ? "true" : undefined}
          >
            <Filter size={13} />
            <Box component="span">{t("toolbar.filter")}</Box>
            {activeFilterCount > 0 && (
              <FilterBadge component="span" variant="caption">
                {activeFilterCount}
              </FilterBadge>
            )}
            <ChevronDown size={13} style={{ marginLeft: 2 }} />
          </FilterButton>

          <FilterMenu
            anchorEl={filterAnchor}
            open={!!filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <SectionLabel>{t("toolbar.status")}</SectionLabel>
            <ChipItem
              icon={<CircleDashed size={13} />}
              label={t("toolbar.filter_dirty")}
              active={statusChips.has("dirty")}
              onSelect={() => toggleChip("dirty")}
            />
            <ChipItem
              icon={<CheckCircle2 size={13} />}
              label={t("toolbar.filter_clean")}
              active={statusChips.has("clean")}
              onSelect={() => toggleChip("clean")}
            />
            <ChipItem
              icon={<ArrowUpFromLine size={13} />}
              label={t("toolbar.filter_ahead")}
              active={statusChips.has("ahead")}
              onSelect={() => toggleChip("ahead")}
            />
            <ChipItem
              icon={<ArrowDownFromLine size={13} />}
              label={t("toolbar.filter_behind")}
              active={statusChips.has("behind")}
              onSelect={() => toggleChip("behind")}
            />
            {groupOptions.length > 1 && (
              <>
                <MenuSeparator />
                <SectionLabel>{tCommon("repos.filter.group_section")}</SectionLabel>
                <ChipItem
                  label={tCommon("repos.filter.group_all")}
                  active={groupFilter === null}
                  onSelect={() => setGroupFilter(null)}
                  indicator="radio"
                />
                {groupOptions.map((g) => (
                  <ChipItem
                    key={g}
                    label={g}
                    active={groupFilter === g}
                    onSelect={() => setGroupFilter(g)}
                    indicator="radio"
                    testId={TEST_IDS.repos.filterGroupOption(g)}
                  />
                ))}
              </>
            )}
            <MenuSeparator />
            <SectionLabel>{t("toolbar.sort_by")}</SectionLabel>
            {SORT_OPTIONS.map((opt) => (
              <ChipItem
                key={opt.key}
                label={t(opt.labelKey)}
                active={sort === opt.key}
                onSelect={() => handleSort(opt.key)}
                indicator="radio"
              />
            ))}
          </FilterMenu>
        </ToolbarRow>
        <ListScroll>
          <RepoActivitySeriesProvider value={activityByRepo}>
            <RepoList
              repos={repos}
              grouped={grouped}
              viewMode={view}
              sort={sort}
              onSort={handleSort}
              selectedRepoId={selectedId}
              onSelect={(r) => setSelectedId((cur) => (cur === r.id ? null : r.id))}
              emptyTitle={dirtyOnly ? t("list.empty_dirty_title") : t("list.empty_title")}
              emptyDescription={dirtyOnly ? t("list.empty_dirty_desc") : t("list.empty_desc")}
            />
          </RepoActivitySeriesProvider>
        </ListScroll>
      </MainColumn>
      {selected && <DetailPane repo={selected} onClose={() => setSelectedId(null)} />}
    </PageRoot>
  );
}
