import { useEffect, useMemo, useState } from "react";

import { useParams } from "react-router-dom";

import { LayoutGrid, List, Rows3 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RepoListSort, RepoListViewMode, SortDirection } from "@recrest/shared";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";
import { RepoListSkeleton } from "@/components/molecules/skeletons/RepoListSkeleton";
import { RepoList } from "@/components/organisms/repos/RepoList";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";
import { setSelectedRepo } from "@/store/slices/uiSlice";

interface ReposPageProps {
  dirtyOnly?: boolean;
}

/** Status chips multi-select: each chip narrows the visible set. The
 *  `dirty/clean` chips are mutually exclusive at the data level — picking
 *  both would yield an empty list — but we don't enforce it in UI; the user
 *  sees the empty state and learns. `ahead/behind` stack with each other
 *  and with dirty/clean. */
type StatusChip = "dirty" | "clean" | "ahead" | "behind";

/** R.2 sort fields. The `""` field means "no sort, fall back to natural
 *  ordering" — kept as the default so the existing grouped-by-folder layout
 *  is preserved when the user hasn't picked a sort. */
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
  const viewMode = useAppSelector((s) => s.settings.repoListViewMode);
  const repoListSort = useAppSelector((s) => s.settings.repoListSort);
  const { repoId } = useParams<{ repoId?: string }>();

  // R.2: status filter chips. Held in component state — the chips are a
  // transient filter, not a persisted preference. The "Changes" page seeds
  // the `dirty` chip via `dirtyOnly` instead of duplicating the logic.
  const [statusChips, setStatusChips] = useState<Set<StatusChip>>(() => new Set());

  useEffect(() => {
    if (repoId) dispatch(setSelectedRepo(repoId));
  }, [dispatch, repoId]);

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
    if (repoListSort.field) {
      const dir = repoListSort.direction === "desc" ? -1 : 1;
      out = [...out].sort((a, b) => {
        if (repoListSort.field === "name") {
          return a.name.localeCompare(b.name) * dir;
        }
        if (repoListSort.field === "lastModified") {
          // Always newest-first when chosen — `direction` is fixed via the
          // single dropdown option, so we don't need to multiply by `dir`.
          return lastCommitTime(b) - lastCommitTime(a);
        }
        if (repoListSort.field === "status") {
          return (statusRank(a) - statusRank(b)) * dir;
        }
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
    void dispatch(
      saveSettings({
        repoListSort: { field: option.field, direction: option.direction },
      }),
    );
  };

  const toggleChip = (chip: StatusChip) => {
    setStatusChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
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
      {/* D.1 + R.2 toolbar. The view toggle and the new filter/sort
       *  controls share one row so they always live next to each other.
       *  The container query in views.scss can still override the layout
       *  to card-mode on narrow viewports for the *grouped* preset only. */}
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
            label={t("repos.view.grouped", { defaultValue: "Grouped" })}
          />
          <ViewToggleButton
            mode="flat"
            current={viewMode}
            onSelect={onChangeView}
            icon={<Rows3 className="h-3.5 w-3.5" aria-hidden />}
            label={t("repos.view.flat", { defaultValue: "Flat" })}
          />
          <ViewToggleButton
            mode="card"
            current={viewMode}
            onSelect={onChangeView}
            icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden />}
            label={t("repos.view.card", { defaultValue: "Card" })}
          />
        </div>

        <div className="repo-page-filters" data-testid="repos-filter-bar">
          <div
            className="repo-page-chips seg-group seg-group--square"
            role="group"
            aria-label={t("repos.filter.label", { defaultValue: "Status filter" })}
          >
            <StatusChipBtn
              chip="dirty"
              active={statusChips.has("dirty")}
              onToggle={toggleChip}
              label={t("repos.filter.dirty", { defaultValue: "Dirty" })}
            />
            <StatusChipBtn
              chip="clean"
              active={statusChips.has("clean")}
              onToggle={toggleChip}
              label={t("repos.filter.clean", { defaultValue: "Clean" })}
            />
            <StatusChipBtn
              chip="ahead"
              active={statusChips.has("ahead")}
              onToggle={toggleChip}
              label={t("repos.filter.ahead", { defaultValue: "Ahead" })}
            />
            <StatusChipBtn
              chip="behind"
              active={statusChips.has("behind")}
              onToggle={toggleChip}
              label={t("repos.filter.behind", { defaultValue: "Behind" })}
            />
          </div>

          <Select value={sortKey(currentSort)} onValueChange={onChangeSort}>
            <SelectTrigger
              className="repo-page-sort"
              data-testid="repos-sort-trigger"
              aria-label={t("repos.sort.label", { defaultValue: "Sort by" })}
            >
              <SelectValue
                placeholder={t("repos.sort.options.default", { defaultValue: "Default" })}
              />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={sortKey(opt)} value={sortKey(opt)}>
                  {t(`repos.sort.options.${opt.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <RepoList repos={filtered} viewMode={viewMode} />
    </div>
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

interface StatusChipBtnProps {
  chip: StatusChip;
  active: boolean;
  onToggle: (chip: StatusChip) => void;
  label: string;
}

function StatusChipBtn({ chip, active, onToggle, label }: StatusChipBtnProps) {
  return (
    <button
      type="button"
      className={cn("repo-page-chip seg-btn", active && "is-active")}
      data-testid={`repos-filter-chip-${chip}`}
      aria-pressed={active}
      onClick={() => onToggle(chip)}
    >
      {label}
    </button>
  );
}
