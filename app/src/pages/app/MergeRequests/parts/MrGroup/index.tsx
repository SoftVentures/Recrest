import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { PullRequest } from "@recrest/shared";

import { ChevronDown, ChevronRight } from "lucide-react";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MrRow } from "@/pages/app/MergeRequests/components/MrRow";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

interface Props {
  repoId: string;
  repoName: string;
  prs: Array<{ pr: PullRequest; repoName: string; repoId: string }>;
  collapsed: boolean;
  selectedKey?: string | null;
  onToggle: () => void;
  onSelectRow: (row: { pr: PullRequest; repoName: string; repoId: string }) => void;
}

export default function MrGroup({
  repoId,
  repoName,
  prs,
  collapsed,
  selectedKey,
  onToggle,
  onSelectRow,
}: Props) {
  return (
    <Box>
      <GroupHead
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        data-testid={TEST_IDS.mr.groupHead(repoId)}
      >
        {collapsed ? <ChevronRight size={pxToRem(11)} /> : <ChevronDown size={pxToRem(11)} />}
        <Box component="span">{repoName}</Box>
        <GroupCount component="span" variant="caption">
          {prs.length}
        </GroupCount>
      </GroupHead>
      {!collapsed &&
        prs.map((row) => {
          const key = `${row.repoId}#${row.pr.number}`;
          return (
            <MrRow
              key={key}
              pr={row.pr}
              repoId={row.repoId}
              repoName={row.repoName}
              selected={selectedKey === key}
              onClick={() => onSelectRow(row)}
            />
          );
        })}
    </Box>
  );
}

// eslint-disable-next-line no-restricted-syntax -- native <button> required: keyboard-focusable group header that toggles the collapse, matches the Repos page pattern
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
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}));

const GroupCount = styled(Typography)(({ theme }) => ({
  padding: pxToRems(0, 6),
  borderRadius: 100,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontSize: fontPxToRem(10),
  color: theme.palette.text.information,
  marginLeft: pxToRem(4),
})) as typeof Typography;
