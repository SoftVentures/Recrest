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
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
