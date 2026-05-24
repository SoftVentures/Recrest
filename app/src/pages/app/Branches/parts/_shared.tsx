import { Box, MenuItem, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { BranchInfo } from "@recrest/shared";

import { RefreshCw } from "lucide-react";

import type { EnrichedRepo } from "@/lib/repoEnrich";

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

export const FilterItem = styled(MenuItem)({
  position: "relative",
  fontSize: 13,
  minHeight: 30,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 32,
  paddingRight: 8,
  gap: 8,
  borderRadius: 8,
  margin: "0 4px",
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    color: "inherit",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiListItemText-primary": { fontSize: 13 },
});

export const LeadingSlot = styled(Typography)(({ theme }) => ({
  position: "absolute",
  left: 8,
  top: "50%",
  width: 14,
  height: 14,
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.primary,
  flexShrink: 0,
})) as typeof Typography;

export const CountSpan = styled(Typography)(({ theme }) => ({
  marginLeft: "auto",
  fontSize: 10,
  fontVariantNumeric: "tabular-nums",
  color: theme.palette.text.information,
})) as typeof Typography;

export const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
  padding: "6px 12px 4px",
})) as typeof Typography;

export const Empty = styled(Box)(({ theme }) => ({
  padding: "24px",
  textAlign: "center",
  color: theme.palette.text.information,
  fontSize: 13,
})) as typeof Box;
