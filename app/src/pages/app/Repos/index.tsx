import { useMemo, useState } from "react";

import { useParams } from "react-router-dom";

import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  Check,
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
import {
  PAGE_DUR_SM,
  PAGE_EASE,
  pgFall,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { DetailPane } from "@/pages/app/Repos/components/DetailPane";
import { RepoList } from "@/pages/app/Repos/components/RepoList";

export interface ReposPageProps {
  dirtyOnly?: boolean;
}

type RepoView = "list" | "card";
type StatusChip = "dirty" | "clean" | "ahead" | "behind";
type SortKey = "default" | "name:asc" | "name:desc" | "lastModified:desc" | "status:asc";

interface SortOption {
  key: SortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "default", label: "Default (grouped)" },
  { key: "name:asc", label: "Name (A → Z)" },
  { key: "name:desc", label: "Name (Z → A)" },
  { key: "lastModified:desc", label: "Recently modified" },
  { key: "status:asc", label: "Status" },
];

function statusRank(repo: EnrichedRepo): number {
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

export default function ReposPage({ dirtyOnly }: ReposPageProps = {}) {
  const enriched = useEnrichedRepos();
  const { repoId } = useParams<{ repoId?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(repoId ?? null);
  const [view, setView] = useState<RepoView>("list");
  const [statusChips, setStatusChips] = useState<Set<StatusChip>>(new Set());
  const [sort, setSort] = useState<SortKey>("default");

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

  const toggleChip = (chip: StatusChip) => {
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
        <ToolbarRow data-testid="repos-toolbar">
          <GeneralButtonGroup
            value={view}
            exclusive
            onChange={(_, v: RepoView | null) => v && setView(v)}
            aria-label="repo view"
          >
            <GeneralButtonGroupItem value="list" data-testid="repo-view-toggle-grouped">
              <ListIcon size={14} aria-hidden style={{ marginRight: 6 }} />
              Default
            </GeneralButtonGroupItem>
            <GeneralButtonGroupItem value="card" data-testid="repo-view-toggle-card">
              <LayoutGrid size={14} aria-hidden style={{ marginRight: 6 }} />
              Cards
            </GeneralButtonGroupItem>
          </GeneralButtonGroup>

          <FilterButton
            type="button"
            data-testid="repos-filter-trigger"
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            data-active={activeFilterCount > 0 ? "true" : undefined}
          >
            <Filter size={13} />
            <span>Filter</span>
            {activeFilterCount > 0 && <FilterBadge>{activeFilterCount}</FilterBadge>}
            <ChevronDown size={13} style={{ marginLeft: 2 }} />
          </FilterButton>

          <Menu
            anchorEl={filterAnchor}
            open={!!filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { width: 240, mt: 0.5 } } }}
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
            <Divider sx={{ my: 0.5 }} />
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
          </Menu>
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

const PageRoot = styled(Box)({
  display: "flex",
  height: "100%",
  minHeight: 0,
});

const MainColumn = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
});

const ToolbarRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  // Toolbar drops in on mount — matches src-old `.p-repos .a-content > [class*="toolbar"]`.
  animation: `${pgFall} ${PAGE_DUR_SM}ms ${PAGE_EASE} both`,
  ...prefersReducedMotionGuard,
});

const FilterButton = styled("button")(({ theme }) => ({
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
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background-color 0.12s ease, border-color 0.12s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
  "&[data-active='true']": {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  },
}));

const FilterBadge = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 5px",
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.background.default,
  marginLeft: 2,
}));

const ListScroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  // Reserve scrollbar gutter so width is identical whether the page
  // currently overflows or not — keeps page-swap horizontally stable.
  scrollbarGutter: "stable",
});

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
  padding: "6px 12px 4px",
})) as typeof Typography;

const FilterItem = styled(MenuItem)({
  position: "relative",
  fontSize: 13,
  minHeight: 30,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 32,
  paddingRight: 8,
  gap: 8,
  borderRadius: 8,
  margin: "0 4px",
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiListItemText-primary": {
    fontSize: 13,
  },
});

const LeadingSlot = styled("span")(({ theme }) => ({
  position: "absolute",
  left: 8,
  top: "50%",
  width: 14,
  height: 14,
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.primary,
  flexShrink: 0,
}));

const RadioDot = styled("span")(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: theme.palette.text.primary,
}));

interface ChipItemProps {
  label: string;
  active: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
  /** `"check"` for boolean status filters, `"radio"` for the sort group. */
  indicator?: "check" | "radio";
}

function ChipItem({ label, active, onSelect, icon, indicator = "check" }: ChipItemProps) {
  return (
    <FilterItem
      onClick={(e) => {
        e.preventDefault();
        onSelect();
      }}
      data-active={active ? "true" : undefined}
    >
      <LeadingSlot>
        {active && (indicator === "check" ? <Check size={16} /> : <RadioDot />)}
      </LeadingSlot>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={label} />
    </FilterItem>
  );
}
