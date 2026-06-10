import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { BranchInfo } from "@recrest/shared";

import { RefreshCw } from "lucide-react";

import type { EnrichedRepo } from "@/lib/repoEnrich";

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

export const SpinIcon = styled(RefreshCw)({
  animation: "branchSpin 0.9s linear infinite",
  "@keyframes branchSpin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
});

export const Empty = styled(Box)(({ theme }) => ({
  padding: "24px",
  textAlign: "center",
  color: theme.palette.text.information,
  fontSize: 13,
})) as typeof Box;
