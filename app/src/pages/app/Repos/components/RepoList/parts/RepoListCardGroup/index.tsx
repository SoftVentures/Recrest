import { useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ChevronDown, ChevronRight } from "lucide-react";

import { RepoListRows } from "@/pages/app/Repos/components/RepoList/parts/RepoListRows";
import { GroupCount, type GroupProps } from "@/pages/app/Repos/components/RepoList/parts/_shared";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const CardGroupShell = styled(Box, {
  shouldForwardProp: (p) => p !== "open",
})<{ open: boolean }>(({ open }) => ({
  display: "flex",
  flexDirection: "column",
  padding: pxToRems(0, 16),
  paddingBottom: open ? pxToRem(10) : 0,
  "& > [data-card-group-grid]": {
    marginTop: pxToRem(6),
  },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const CardGroupHead = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  background: "transparent",
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  width: "100%",
  textAlign: "left",
  padding: pxToRems(2, 4),
  fontSize: fontPxToRem(11),
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
        {open ? <ChevronDown size={pxToRem(11)} /> : <ChevronRight size={pxToRem(11)} />}
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
