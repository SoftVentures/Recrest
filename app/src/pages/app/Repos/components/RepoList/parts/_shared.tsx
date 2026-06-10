import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { EnrichedRepo } from "@/lib/repoEnrich";

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
  // `min(280px, 100%)` lets the card shrink below 280px on tiny viewports so
  // it doesn't push out of the page (and lets its inner action cluster wrap).
  gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
  gap: 12,
  padding: 0,
}) as typeof Box;

export const GroupCount = styled(Typography)(({ theme }) => ({
  padding: "0 6px",
  borderRadius: 100,
  backgroundColor: theme.palette.surface.interface.backElevation,
  fontSize: 10,
  color: theme.palette.text.information,
  marginLeft: 4,
})) as typeof Typography;
