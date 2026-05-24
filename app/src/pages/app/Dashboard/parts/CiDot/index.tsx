import { Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

import type { CiTone } from "@/lib/constants/ciStates.constants";

/** Dashboard / Activity CI-dot variant — collapses "idle" + null into the dash case. */
export type CiState = CiTone | null;

type ActiveCiTone = Exclude<CiTone, "idle">;

interface CiDotInnerProps {
  state: ActiveCiTone;
}

export function CiDot({ state }: { state: CiState }) {
  if (!state || state === "idle")
    return (
      <CiEmpty component="span" variant="caption">
        —
      </CiEmpty>
    );
  return (
    <CiPill component="span" variant="caption">
      <CiDotBase state={state} />
      {state}
    </CiPill>
  );
}

export default CiDot;

const CiPill = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: theme.palette.text.primary,
  fontWeight: 500,
  flexShrink: 0,
})) as typeof Typography;

const ciPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70%  { box-shadow: 0 0 0 5px transparent; opacity: 1; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
`;

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const CiDotBase = styled("span", {
  shouldForwardProp: (p) => p !== "state",
})<CiDotInnerProps>(({ theme, state }) => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background:
    state === "passing"
      ? theme.palette.success.main
      : state === "failing"
        ? theme.palette.error.main
        : state === "running"
          ? theme.palette.warning.main
          : theme.palette.text.informationLight,
  color: state === "running" ? `${theme.palette.warning.main}55` : "transparent",
  ...(state === "running"
    ? {
        animation: `${ciPulse} 1600ms ease-out infinite`,
        'html[data-reduced-motion="true"] &': {
          animation: "none",
          boxShadow: `0 0 0 3px ${theme.palette.warning.main}22`,
        },
      }
    : null),
}));

const CiEmpty = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: 11,
})) as typeof Typography;
