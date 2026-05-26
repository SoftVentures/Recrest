import { useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ChevronDown, ChevronRight } from "lucide-react";

import { RepoListRows } from "@/pages/app/Repos/components/RepoList/parts/RepoListRows";
import { GroupCount, type GroupProps } from "@/pages/app/Repos/components/RepoList/parts/_shared";

const CardGroupShell = styled(Box, {
  shouldForwardProp: (p) => p !== "open",
})<{ open: boolean }>(({ open }) => ({
  display: "flex",
  flexDirection: "column",
  padding: "0 16px",
  paddingBottom: open ? "10px" : 0,
  "& > [data-card-group-grid]": {
    marginTop: 6,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
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

export function RepoListCardGroup({ name, repos, selectedRepoId, onSelect, viewMode }: GroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <CardGroupShell open={open}>
      <CardGroupHead type="button" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {name}
        <GroupCount component="span" variant="caption">
          {repos.length}
        </GroupCount>
      </CardGroupHead>
      {open && (
        <RepoListRows
          repos={repos}
          selectedRepoId={selectedRepoId}
          onSelect={onSelect}
          viewMode={viewMode}
        />
      )}
    </CardGroupShell>
  );
}

export default RepoListCardGroup;
