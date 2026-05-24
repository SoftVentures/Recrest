import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

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
  emptyTitle?: string;
  emptyDescription?: string;
}

const TableShell = styled(Box)(({ theme }) => ({
  margin: theme.spacing(0, 1.5, 0, 2),
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  [`& > *:last-child [data-testid='${TEST_IDS.repos.row}']:last-of-type`]: {
    borderBottom: 0,
  },
})) as typeof Box;

export function RepoList({
  repos,
  selectedRepoId,
  onSelect,
  grouped = true,
  viewMode = "list",
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
        <Box data-testid={TEST_IDS.repos.list} sx={{ padding: "0 16px" }}>
          <RepoListRows
            repos={repos}
            selectedRepoId={selectedRepoId}
            onSelect={onSelect}
            viewMode={viewMode}
          />
        </Box>
      );
    }
    const byGroupCard = new Map<string, EnrichedRepo[]>();
    for (const r of repos) {
      const list = byGroupCard.get(r.group) ?? [];
      list.push(r);
      byGroupCard.set(r.group, list);
    }
    return (
      <Box
        data-testid={TEST_IDS.repos.list}
        sx={{ display: "flex", flexDirection: "column", gap: 0 }}
      >
        {[...byGroupCard.entries()].map(([name, items]) => (
          <RepoListCardGroup
            key={name}
            name={name}
            repos={items}
            selectedRepoId={selectedRepoId}
            onSelect={onSelect}
            viewMode={viewMode}
          />
        ))}
      </Box>
    );
  }

  // List mode: the entire table sits inside a bordered card container — sticky
  // header at top, grouped rows below, the last row's bottom border collapses
  // into the shell's bottom edge.
  if (!grouped) {
    return (
      <TableShell data-testid={TEST_IDS.repos.list}>
        <RepoListHead />
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

  return (
    <TableShell data-testid={TEST_IDS.repos.list}>
      <RepoListHead />
      {[...byGroup.entries()].map(([name, items]) => (
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
