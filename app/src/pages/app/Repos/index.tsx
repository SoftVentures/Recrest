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
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import type { RepoSortKey } from "@/lib/constants/sortKeys.constants";
import type { RepoStatusChip } from "@/lib/constants/statusChips.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { lastCommitTime, statusRank } from "@/lib/utils/repoSort.utils";
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

export interface ReposPageProps {
  dirtyOnly?: boolean;
}

type RepoView = "list" | "card";

interface SortOption {
  key: RepoSortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "default", label: "Default (grouped)" },
  { key: "name:asc", label: "Name (A → Z)" },
  { key: "name:desc", label: "Name (Z → A)" },
  { key: "lastModified:desc", label: "Recently modified" },
  { key: "status:asc", label: "Status" },
];

export default function ReposPage({ dirtyOnly }: ReposPageProps = {}) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const enriched = useEnrichedRepos();
  const { repoId } = useParams<{ repoId?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(repoId ?? null);
  const [view, setView] = useState<RepoView>("list");
  const [statusChips, setStatusChips] = useState<Set<RepoStatusChip>>(new Set());
  const [sort, setSort] = useState<RepoSortKey>("default");

  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  const repos = useMemo<EnrichedRepo[]>(() => {
    let out = dirtyOnly ? enriched.filter((r) => r.status.dirty) : enriched;
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
    if (sort === "name:asc") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "name:desc") out = [...out].sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "lastModified:desc")
      out = [...out].sort((a, b) => lastCommitTime(b) - lastCommitTime(a));
    else if (sort === "status:asc") out = [...out].sort((a, b) => statusRank(a) - statusRank(b));
    return out;
  }, [enriched, dirtyOnly, statusChips, sort]);

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

  const activeFilterCount = statusChips.size + (sort === "default" ? 0 : 1);

  return (
    <PageRoot data-testid={dirtyOnly ? "changes-page" : "repos-page"}>
      <MainColumn>
        <ToolbarRow data-testid={TEST_IDS.repos.toolbar}>
          <GeneralButtonGroup
            value={view}
            exclusive
            density="xs"
            onChange={(_, v: RepoView | null) => v && setView(v)}
            aria-label={tAria("repo.view_toggle")}
          >
            <GeneralButtonGroupItem value="list" data-testid={TEST_IDS.repos.viewToggle.grouped}>
              <ListIcon size={14} aria-hidden style={{ marginRight: 6 }} />
              Default
            </GeneralButtonGroupItem>
            <GeneralButtonGroupItem value="card" data-testid={TEST_IDS.repos.viewToggle.card}>
              <LayoutGrid size={14} aria-hidden style={{ marginRight: 6 }} />
              Cards
            </GeneralButtonGroupItem>
          </GeneralButtonGroup>

          <FilterButton
            type="button"
            data-testid={TEST_IDS.repos.filterTrigger}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            data-active={activeFilterCount > 0 ? "true" : undefined}
          >
            <Filter size={13} />
            <Box component="span">Filter</Box>
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
            <SectionLabel>Status</SectionLabel>
            <ChipItem
              icon={<CircleDashed size={13} />}
              label="Dirty"
              active={statusChips.has("dirty")}
              onSelect={() => toggleChip("dirty")}
            />
            <ChipItem
              icon={<CheckCircle2 size={13} />}
              label="Clean"
              active={statusChips.has("clean")}
              onSelect={() => toggleChip("clean")}
            />
            <ChipItem
              icon={<ArrowUpFromLine size={13} />}
              label="Ahead"
              active={statusChips.has("ahead")}
              onSelect={() => toggleChip("ahead")}
            />
            <ChipItem
              icon={<ArrowDownFromLine size={13} />}
              label="Behind"
              active={statusChips.has("behind")}
              onSelect={() => toggleChip("behind")}
            />
            <MenuSeparator />
            <SectionLabel>Sort by</SectionLabel>
            {SORT_OPTIONS.map((opt) => (
              <ChipItem
                key={opt.key}
                label={opt.label}
                active={sort === opt.key}
                onSelect={() => setSort(opt.key)}
                indicator="radio"
              />
            ))}
          </FilterMenu>
        </ToolbarRow>
        <ListScroll>
          <RepoList
            repos={repos}
            grouped={grouped}
            viewMode={view}
            selectedRepoId={selectedId}
            onSelect={(r) => setSelectedId((cur) => (cur === r.id ? null : r.id))}
            emptyTitle={dirtyOnly ? "No dirty repositories" : "No repositories"}
            emptyDescription={
              dirtyOnly
                ? "Working copies match HEAD — there's nothing to commit."
                : "Add a repo from the header to get started."
            }
          />
        </ListScroll>
      </MainColumn>
      {selected && <DetailPane repo={selected} onClose={() => setSelectedId(null)} />}
    </PageRoot>
  );
}
