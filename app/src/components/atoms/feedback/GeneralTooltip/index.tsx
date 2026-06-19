import { type ComponentProps } from "react";

import { Tooltip, tooltipClasses } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * App-wide tooltip styled to match the `bg-popover` surface from `src-old`:
 * theme-bound background (light / dark), border + small
 * shadow, rounded-md radius, no MUI default dark-grey block. The slide+fade
 * comes from MUI's built-in `Fade` transition (which honours user-side
 * reduced-motion via the same CSS toggle we use elsewhere).
 *
 * Use this anywhere we previously reached for raw `@mui/material/Tooltip`.
 * Same prop surface as the underlying component so it's a drop-in swap.
 */
type Props = ComponentProps<typeof Tooltip>;

const Styled = styled(({ className, ...rest }: Props) => (
  <Tooltip {...rest} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.surface.interface.base,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 11.5,
    fontWeight: 500,
    lineHeight: 1.4,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 8px 24px -12px rgba(0,0,0,0.7), 0 2px 6px -2px rgba(0,0,0,0.55)"
        : "0 8px 24px -12px rgba(20,22,28,0.22), 0 2px 6px -2px rgba(20,22,28,0.10)",
    // Tabular nums for any numerals that fall inside (commit counts, dates).
    fontVariantNumeric: "tabular-nums",
    maxWidth: 280,
  },
}));

// No `enterDelay` — tooltips should appear immediately on hover, anywhere
// on the trigger. Arrow is intentionally absent (cleaner read at the small
// type sizes the dashboard uses; the placement+offset already communicates
// which element the tooltip belongs to).
function GeneralTooltip(props: Props) {
  return <Styled enterDelay={0} leaveDelay={0} {...props} />;
}

export default GeneralTooltip;
