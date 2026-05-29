import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { RepoSortKey } from "@recrest/shared";

import EmptyState from "@/components/molecules/feedback/EmptyState";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { RepoListCardGroup } from "@/pages/app/Repos/components/RepoList/parts/RepoListCardGroup";
import { RepoListGroup } from "@/pages/app/Repos/components/RepoList/parts/RepoListGroup";
import { RepoListHead } from "@/pages/app/Repos/components/RepoList/parts/RepoListHead";
import { RepoListRows } from "@/pages/app/Repos/components/RepoList/parts/RepoListRows";
import type { RepoListViewMode } from "@/pages/app/Repos/components/RepoList/parts/_shared";

export type { RepoListViewMode };

export interface RepoListProps {
  repos: EnrichedRepo[];
  selectedRepoId?: string | null;
  onSelect?: (repo: EnrichedRepo) => void;
  grouped?: boolean;
  viewMode?: RepoListViewMode;
  sort?: RepoSortKey;
  onSort?: (key: RepoSortKey) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const TableShell = styled(Box)(({ theme }) => ({
  margin: theme.spacing(0, 3),
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  // Floor matching the column-min sum (220+130+110+120+140 + 48 gaps + 32
  // padding). Below this the grid would squish unreadably; instead the table
  // keeps its width and the surrounding `ListScroll` (overflow:auto) scrolls
  // horizontally — e.g. when the detail pane is open or the window is narrow.
  minWidth: 800,
  [`& > *:last-child [data-testid='${TEST_IDS.repos.row}']:last-of-type`]: {
    borderBottom: 0,
  },
})) as typeof Box;

const CardListPadding = styled(Box)({
  padding: "0 24px",
}) as typeof Box;

const CardGroupStack = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 0,
}) as typeof Box;

export function RepoList({
  repos,
  selectedRepoId,
  onSelect,
  grouped = true,
  viewMode = "list",
  sort,
  onSort,
  emptyTitle,
  emptyDescription,
}: RepoListProps) {
  if (repos.length === 0) {
    return (
      <Box data-testid={TEST_IDS.repos.listEmpty}>
        <EmptyState
          mascot="waving"
          title={emptyTitle ?? "No repositories"}
          description={emptyDescription ?? "Add a repo from the header to get started."}
        />
      </Box>
    );
  }

  if (viewMode === "card") {
    if (!grouped) {
      return (
        <CardListPadding data-testid={TEST_IDS.repos.list}>
          <RepoListRows
            repos={repos}
            selectedRepoId={selectedRepoId}
            onSelect={onSelect}
            viewMode={viewMode}
          />
        </CardListPadding>
      );
    }
    const byGroupCard = new Map<string, EnrichedRepo[]>();
    for (const r of repos) {
      const list = byGroupCard.get(r.group) ?? [];
      list.push(r);
      byGroupCard.set(r.group, list);
    }
    const cardEntries = [...byGroupCard.entries()].sort(([a], [b]) => a.localeCompare(b));
    return (
      <CardGroupStack data-testid={TEST_IDS.repos.list}>
        {cardEntries.map(([name, items]) => (
          <RepoListCardGroup
            key={name}
            name={name}
            repos={items}
            selectedRepoId={selectedRepoId}
            onSelect={onSelect}
            viewMode={viewMode}
          />
        ))}
      </CardGroupStack>
    );
  }

  // List mode: the entire table sits inside a bordered card container — sticky
  // header at top, grouped rows below, the last row's bottom border collapses
  // into the shell's bottom edge.
  if (!grouped) {
    return (
      <TableShell data-testid={TEST_IDS.repos.list}>
        <RepoListHead sort={sort} onSort={onSort} />
        <RepoListRows
          repos={repos}
          selectedRepoId={selectedRepoId}
          onSelect={onSelect}
          viewMode={viewMode}
        />
      </TableShell>
    );
  }

  const byGroup = new Map<string, EnrichedRepo[]>();
  for (const r of repos) {
    const list = byGroup.get(r.group) ?? [];
    list.push(r);
    byGroup.set(r.group, list);
  }
  // Group headers sort alphabetically (case-insensitive via localeCompare).
  // The previous Map-iteration order followed first-insertion, which surfaced
  // groups in arbitrary order depending on which repo loaded first.
  const groupEntries = [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <TableShell data-testid={TEST_IDS.repos.list}>
      <RepoListHead sort={sort} onSort={onSort} />
      {groupEntries.map(([name, items]) => (
        <RepoListGroup
          key={name}
          name={name}
          repos={items}
          selectedRepoId={selectedRepoId}
          onSelect={onSelect}
          viewMode={viewMode}
        />
      ))}
    </TableShell>
  );
}
