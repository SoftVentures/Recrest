import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { BranchInfo } from "@recrest/shared";

import type { EnrichedRepo } from "@/lib/repoEnrich";
import { fontPxToRem, pxToRem } from "@/theme/scale";

// Filter primitives now live in the shared FilterMenuItem molecule — re-export
// here so existing imports inside Branches keep working without churn.
export {
  CountSpan,
  FilterItem,
  LeadingSlot,
  SectionLabel,
} from "@/components/molecules/filters/FilterMenuItem";

export interface BranchesByRepo {
  repo: EnrichedRepo;
  branches: BranchInfo[];
}

export const Empty = styled(Box)(({ theme }) => ({
  padding: pxToRem(24),
  textAlign: "center",
  color: theme.palette.text.information,
  fontSize: fontPxToRem(13),
})) as typeof Box;
