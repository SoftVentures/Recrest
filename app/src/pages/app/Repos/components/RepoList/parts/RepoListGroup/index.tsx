import { useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ChevronDown, ChevronRight } from "lucide-react";

import { RepoListRows } from "@/pages/app/Repos/components/RepoList/parts/RepoListRows";
import { GroupCount, type GroupProps } from "@/pages/app/Repos/components/RepoList/parts/_shared";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const GroupHead = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(6),
  padding: pxToRems(10, 16),
  background: "transparent",
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  width: "100%",
  textAlign: "left",
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(11),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

export function RepoListGroup({ name, repos, selectedRepoId, onSelect, viewMode }: GroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <Box>
      <GroupHead type="button" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown size={pxToRem(11)} /> : <ChevronRight size={pxToRem(11)} />}
        {name}
        <GroupCount component="span" variant="caption">
          {repos.length}
        </GroupCount>
      </GroupHead>
      {open && (
        <RepoListRows
          repos={repos}
          selectedRepoId={selectedRepoId}
          onSelect={onSelect}
          viewMode={viewMode}
        />
      )}
    </Box>
  );
}

export default RepoListGroup;
