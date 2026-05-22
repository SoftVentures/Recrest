import { useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ChevronDown, ChevronRight } from "lucide-react";

import EmptyStatePlaceholder from "@/components/molecules/placeholders/EmptyStatePlaceholder";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { RepoCard } from "@/pages/app/Repos/components/RepoCard";
import { RepoRow } from "@/pages/app/Repos/components/RepoRow";

export type RepoListViewMode = "list" | "card";

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
  // Right margin compensates for the parent ListScroll's 4px scrollbar gutter
  // so the table's right edge aligns with the toolbar above.
  margin: theme.spacing(0, 1.5, 0, 2),
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.border.default}`,
  borderRadius: theme.spacing(1),
  overflow: "hidden",
  "& > *:last-child [data-testid='repo-row']:last-of-type": {
    borderBottom: 0,
  },
}));

const TableHead = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.6fr) minmax(130px, 0.9fr) 110px 120px minmax(140px, auto)",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  fontSize: 10.5,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "sticky",
  top: 0,
  backgroundColor: theme.palette.surface.interface.base,
  zIndex: 1,
}));

const ActionsHead = styled("span")({
  justifySelf: "end",
});

const GroupHead = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 16px",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  width: "100%",
  textAlign: "left",
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const GroupCount = styled("span")(({ theme }) => ({
  padding: "0 6px",
  borderRadius: 100,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontSize: 10,
  color: theme.palette.text.information,
  marginLeft: 4,
}));

interface RowsProps {
  repos: EnrichedRepo[];
  selectedRepoId?: string | null;
  onSelect?: (repo: EnrichedRepo) => void;
  viewMode?: RepoListViewMode;
}

function Rows({ repos, selectedRepoId, onSelect, viewMode = "list" }: RowsProps) {
  if (viewMode === "card") {
    return (
      <CardGrid data-card-group-grid>
        {repos.map((r) => (
          <RepoCard key={r.id} repo={r} selected={selectedRepoId === r.id} onClick={onSelect} />
        ))}
      </CardGrid>
    );
  }
  return (
    <>
      {repos.map((r) => (
        <RepoRow key={r.id} repo={r} selected={selectedRepoId === r.id} onClick={onSelect} />
      ))}
    </>
  );
}

const CardGrid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 12,
  padding: 0,
});

const CardGroupShell = styled(Box)({
  display: "flex",
  flexDirection: "column",
  padding: "0 16px",
  "& > [data-card-group-grid]": {
    marginTop: 6,
  },
});

const CardGroupHead = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  width: "100%",
  textAlign: "left",
  padding: "2px 4px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
  "&:hover": {
    color: theme.palette.text.primary,
  },
}));

interface GroupProps extends RowsProps {
  name: string;
}

function Group({ name, repos, selectedRepoId, onSelect, viewMode }: GroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <Box>
      <GroupHead type="button" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {name}
        <GroupCount>{repos.length}</GroupCount>
      </GroupHead>
      {open && (
        <Rows
          repos={repos}
          selectedRepoId={selectedRepoId}
          onSelect={onSelect}
          viewMode={viewMode}
        />
      )}
    </Box>
  );
}

function CardGroup({ name, repos, selectedRepoId, onSelect, viewMode }: GroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <CardGroupShell sx={{ paddingBottom: open ? "10px" : 0 }}>
      <CardGroupHead type="button" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {name}
        <GroupCount>{repos.length}</GroupCount>
      </CardGroupHead>
      {open && (
        <Rows
          repos={repos}
          selectedRepoId={selectedRepoId}
          onSelect={onSelect}
          viewMode={viewMode}
        />
      )}
    </CardGroupShell>
  );
}

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
      <Box data-testid="repo-list-empty">
        <EmptyStatePlaceholder
          title={emptyTitle ?? "No repositories"}
          description={emptyDescription ?? "Add a repo from the header to get started."}
        />
      </Box>
    );
  }

  // Cards mode: each group is a plain section with a header + grid.
  // No outer shell — the cards themselves carry their bordered look.
  if (viewMode === "card") {
    if (!grouped) {
      return (
        <Box data-testid="repo-list" sx={{ padding: "0 16px" }}>
          <Rows
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
      <Box data-testid="repo-list" sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {[...byGroupCard.entries()].map(([name, items]) => (
          <CardGroup
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

  // List mode: the entire table sits inside a bordered card container, matching
  // src-old `.a-table` — sticky header at the top, grouped rows below, the
  // last row's bottom border collapses into the shell's bottom edge.
  const head = (
    <TableHead>
      <span>Repository</span>
      <span>Branch</span>
      <span>Status</span>
      <span>Activity · 14d</span>
      <ActionsHead>Actions</ActionsHead>
    </TableHead>
  );

  if (!grouped) {
    return (
      <TableShell data-testid="repo-list">
        {head}
        <Rows
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
    <TableShell data-testid="repo-list">
      {head}
      {[...byGroup.entries()].map(([name, items]) => (
        <Group
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
