import { useEffect, useMemo } from "react";

import { useParams } from "react-router-dom";

import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RepoListSort, RepoListViewMode, SortDirection } from "@recrest/shared";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/compounds/DropdownMenu";
import { RepoListSkeleton } from "@/components/molecules/skeletons/RepoListSkeleton";
import { RepoList } from "@/components/organisms/repos/RepoList";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";
import {
  type RepoFilterPage,
  type RepoStatusChip,
  setRepoFilterSort,
  setSelectedRepo,
  toggleRepoStatusChip,
} from "@/store/slices/uiSlice";

interface ReposPageProps {
  dirtyOnly?: boolean;
}

type StatusChip = RepoStatusChip;

type SortField = "" | "name" | "lastModified" | "status";

interface SortOption {
  field: SortField;
  direction: SortDirection;
  /** i18n key under `repos.sort.options` */
  key: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: "", direction: "asc", key: "default" },
  { field: "name", direction: "asc", key: "name_asc" },
  { field: "name", direction: "desc", key: "name_desc" },
  { field: "lastModified", direction: "desc", key: "modified_desc" },
  { field: "status", direction: "asc", key: "status" },
];

/** Radix `<Select.Item>` forbids `value=""` (it's reserved as the
 *  "no selection" sentinel and throws at render time). We map the
 *  default sort option (which uses `field: ""` in the DTO to mean
 *  "no sort applied") to the literal `"default"` for the Radix layer
 *  only — the persisted DTO shape via `RepoListSort` is unchanged. */
function sortKey(option: SortOption): string {
  return option.field === "" ? "default" : `${option.field}:${option.direction}`;
}

function findOption(sort: RepoListSort): SortOption {
  const match = SORT_OPTIONS.find((o) => o.field === sort.field && o.direction === sort.direction);
  return match ?? SORT_OPTIONS[0]!;
}

function statusRank(repo: EnrichedRepo): number {
  // Lower rank shows up first when sorting by status. The order roughly
  // mirrors "needs attention → in flight → clean".
  if (repo.status.conflicted > 0) return 0;
  if (repo.status.dirty) return 1;
  if (repo.status.behind > 0) return 2;
  if (repo.status.ahead > 0) return 3;
  return 4;
}

function lastCommitTime(repo: EnrichedRepo): number {
  const ts = repo.status.lastCommit?.timestamp;
  if (!ts) return 0;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ReposPage({ dirtyOnly = false }: ReposPageProps) {
  useScrollRestoration(dirtyOnly ? "dirty" : "repos");
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const repos = useEnrichedRepos();
  const loading = useAppSelector((s) => s.repos.loading);
  const error = useAppSelector((s) => s.repos.error);
  const rawViewMode = useAppSelector((s) => s.settings.repoListViewMode);
  const viewMode: RepoListViewMode = rawViewMode === "flat" ? "grouped" : rawViewMode;
  const filterPage: RepoFilterPage = dirtyOnly ? "changes" : "repos";
  const repoListSort = useAppSelector((s) => s.ui.repoFilters[filterPage].sort);
  const statusChipsList = useAppSelector((s) => s.ui.repoFilters[filterPage].statusChips);
  const statusChips = useMemo(() => new Set<StatusChip>(statusChipsList), [statusChipsList]);
  const { repoId } = useParams<{ repoId?: string }>();

  useEffect(() => {
    if (repoId) dispatch(setSelectedRepo(repoId));
  }, [dispatch, repoId]);

  // Grouping is driven by sort, not by view mode. No sort = group by folder
  // (both table and card layouts); active sort = flat list in the chosen
  // order. Card mode falls back to a flat A→Z list when neither applies.
  const isGrouped = !repoListSort.field;

  const filtered = useMemo(() => {
    let out = dirtyOnly ? repos.filter((r) => r.status.dirty) : repos;
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
    const dir = repoListSort.direction === "desc" ? -1 : 1;
    if (repoListSort.field) {
      out = [...out].sort((a, b) => {
        if (repoListSort.field === "name") return a.name.localeCompare(b.name) * dir;
        if (repoListSort.field === "lastModified") return lastCommitTime(b) - lastCommitTime(a);
        if (repoListSort.field === "status") return (statusRank(a) - statusRank(b)) * dir;
        return 0;
      });
    }
    return out;
  }, [repos, dirtyOnly, statusChips, repoListSort]);

  const pageTestId = dirtyOnly ? "changes-page" : "repos-page";
  const pageClass = dirtyOnly ? "p-repos p-repos-dirty" : "p-repos";

  const onChangeView = (mode: RepoListViewMode) => {
    void dispatch(saveSettings({ repoListViewMode: mode }));
  };

  const onChangeSort = (key: string) => {
    const option = SORT_OPTIONS.find((o) => sortKey(o) === key) ?? SORT_OPTIONS[0]!;
    dispatch(
      setRepoFilterSort({
        page: filterPage,
        sort: { field: option.field, direction: option.direction },
      }),
    );
  };

  const toggleChip = (chip: StatusChip) => {
    dispatch(toggleRepoStatusChip({ page: filterPage, chip }));
  };

  if (loading && repos.length === 0) {
    return (
      <div className={pageClass} data-testid={pageTestId}>
        <RepoListSkeleton rows={8} />
      </div>
    );
  }

  const currentSort = findOption(repoListSort);

  return (
    <div className={pageClass} data-testid={pageTestId}>
      {error && (
        <div
          role="alert"
          data-testid="repos-page-error"
          className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}
      <div className="repo-page-toolbar-row" data-testid="repos-toolbar">
        <div
          className="repo-page-toolbar seg-group seg-group--square"
          role="group"
          aria-label={t("repos.view.toggle_label", { defaultValue: "View mode" })}
        >
          <ViewToggleButton
            mode="grouped"
            current={viewMode}
            onSelect={onChangeView}
            icon={<List className="h-3.5 w-3.5" aria-hidden />}
            label={t("repos.view.default", { defaultValue: "Default" })}
          />
          <ViewToggleButton
            mode="card"
            current={viewMode}
            onSelect={onChangeView}
            icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden />}
            label={t("repos.view.cards", { defaultValue: "Cards" })}
          />
        </div>

        <ReposFiltersDropdown
          statusChips={statusChips}
          onToggleChip={toggleChip}
          currentSortKey={sortKey(currentSort)}
          onSelectSort={onChangeSort}
        />
      </div>
      <RepoList repos={filtered} viewMode={viewMode} grouped={isGrouped} />
    </div>
  );
}

interface ReposFiltersDropdownProps {
  statusChips: Set<StatusChip>;
  onToggleChip: (chip: StatusChip) => void;
  currentSortKey: string;
  onSelectSort: (key: string) => void;
}

function ReposFiltersDropdown({
  statusChips,
  onToggleChip,
  currentSortKey,
  onSelectSort,
}: ReposFiltersDropdownProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="r-filter-trigger" data-testid="repos-filter-trigger">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          <span>{t("repos.filter.button", { defaultValue: "Filter" })}</span>
          <ChevronDown className="r-filter-chev h-3.5 w-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("repos.filter.label", { defaultValue: "Status" })}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={statusChips.has("dirty")}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onToggleChip("dirty")}
        >
          <CircleDashed className="mr-2 h-3.5 w-3.5" aria-hidden />
          {t("repos.filter.dirty", { defaultValue: "Dirty" })}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusChips.has("clean")}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onToggleChip("clean")}
        >
          <CheckCircle2 className="mr-2 h-3.5 w-3.5" aria-hidden />
          {t("repos.filter.clean", { defaultValue: "Clean" })}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusChips.has("ahead")}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onToggleChip("ahead")}
        >
          <ArrowUpFromLine className="mr-2 h-3.5 w-3.5" aria-hidden />
          {t("repos.filter.ahead", { defaultValue: "Ahead" })}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusChips.has("behind")}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onToggleChip("behind")}
        >
          <ArrowDownFromLine className="mr-2 h-3.5 w-3.5" aria-hidden />
          {t("repos.filter.behind", { defaultValue: "Behind" })}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("repos.sort.label", { defaultValue: "Sort by" })}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentSortKey} onValueChange={onSelectSort}>
          {SORT_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={sortKey(opt)}
              value={sortKey(opt)}
              onSelect={(e) => e.preventDefault()}
            >
              {t(`repos.sort.options.${opt.key}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ViewToggleButtonProps {
  mode: RepoListViewMode;
  current: RepoListViewMode;
  onSelect: (mode: RepoListViewMode) => void;
  icon: React.ReactNode;
  label: string;
}

function ViewToggleButton({ mode, current, onSelect, icon, label }: ViewToggleButtonProps) {
  const active = current === mode;
  return (
    <button
      type="button"
      className={cn("repo-view-btn seg-btn", active && "is-active")}
      data-active={active ? "true" : undefined}
      data-testid={`repo-view-toggle-${mode}`}
      onClick={() => onSelect(mode)}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
