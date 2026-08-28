import type { ReactNode } from "react";

import { styled } from "@mui/material/styles";

import { StatusTone, toneChip } from "@/lib/utils/toneColor.utils";
import { fontPxToRem, pxToRems } from "@/theme/scale";

export type BranchFilterChipTone = "current" | "dirty" | "clean" | "remote";

export interface BranchFilterChipProps {
  tone: BranchFilterChipTone;
  /** Visible label — translated by the consumer. */
  children: ReactNode;
  className?: string;
}

const FORWARD = (p: PropertyKey) => p !== "tone";

// eslint-disable-next-line no-restricted-syntax -- inline-status pill; <span> keeps it inline inside the branch name cell without a block wrapper
const Root = styled("span", { shouldForwardProp: FORWARD })<{ tone: BranchFilterChipTone }>(
  ({ theme, tone }) => ({
    display: "inline-flex",
    alignItems: "center",
    fontSize: fontPxToRem(9.5),
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: pxToRems(2, 7),
    borderRadius: 100,
    ...(tone === "current" && toneChip(theme, StatusTone.PRIMARY, 14)),
    ...(tone === "dirty" && toneChip(theme, StatusTone.WARNING)),
    ...(tone === "clean" && {
      backgroundColor: theme.palette.surface.interface.backElevation,
      color: theme.palette.text.information,
    }),
    ...(tone === "remote" && {
      backgroundColor: theme.palette.surface.interface.backElevation,
      color: theme.palette.text.secondary,
    }),
  }),
);

function BranchFilterChip({ tone, children, className }: BranchFilterChipProps) {
  return (
    <Root tone={tone} className={className}>
      {children}
    </Root>
  );
}

export default BranchFilterChip;
