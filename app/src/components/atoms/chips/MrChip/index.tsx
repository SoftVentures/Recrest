import type { ReactNode } from "react";

import { Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PrState } from "@recrest/shared";

import { StatusTone, toneChip } from "@/lib/utils/toneColor.utils";

export interface MrChipProps {
  /** Underlying PR state. Ignored for colouring when `draft` is `true`. */
  state?: PrState;
  /** Draft PRs render in the muted draft tone regardless of `state`. */
  draft?: boolean;
  /** Visible label — translated by the consumer. */
  children: ReactNode;
  className?: string;
}

type Tone = PrState | "draft";

const FORWARD = (p: PropertyKey) => p !== "tone";

const Root = styled(Typography, { shouldForwardProp: FORWARD })<{ tone: Tone }>(
  ({ theme, tone }) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 6px",
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    ...(tone === "draft" && {
      backgroundColor: theme.palette.surface.interface.backElevation,
      color: theme.palette.text.information,
    }),
    ...(tone === PrState.OPEN && toneChip(theme, StatusTone.SUCCESS, 15)),
    ...(tone === PrState.MERGED && toneChip(theme, StatusTone.PRIMARY, 15)),
    ...(tone === PrState.CLOSED && toneChip(theme, StatusTone.ERROR, 15)),
  }),
);

function MrChip({ state = PrState.OPEN, draft = false, children, className }: MrChipProps) {
  const tone: Tone = draft ? "draft" : state;
  return (
    <Root variant="caption" tone={tone} className={className}>
      {children}
    </Root>
  );
}

export default MrChip;
