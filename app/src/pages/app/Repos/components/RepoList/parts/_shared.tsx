import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { EnrichedRepo } from "@/lib/repoEnrich";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export type RepoListViewMode = "list" | "card";

export interface RowsProps {
  repos: EnrichedRepo[];
  selectedRepoId?: string | null;
  onSelect?: (repo: EnrichedRepo) => void;
  viewMode?: RepoListViewMode;
}

export interface GroupProps extends RowsProps {
  name: string;
}

export const CardGrid = styled(Box)({
  display: "grid",
  // The inner `min(…, 100%)` lets the card shrink below its 280 design px on
  // tiny viewports so it doesn't push out of the page (and lets its inner
  // action cluster wrap).
  gridTemplateColumns: `repeat(auto-fill, minmax(min(${pxToRem(280)}, 100%), 1fr))`,
  gap: pxToRem(12),
  padding: 0,
}) as typeof Box;

export const GroupCount = styled(Typography)(({ theme }) => ({
  padding: pxToRems(0, 6),
  borderRadius: 100,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontSize: fontPxToRem(10),
  color: theme.palette.text.information,
  marginLeft: pxToRem(4),
})) as typeof Typography;
