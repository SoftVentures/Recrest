import { Children, type ReactNode, isValidElement, useLayoutEffect, useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Wrap a list of sibling elements and animate them in with a per-child
 * stagger. Each child gets a `transition-delay` of `step * index` ms. Same
 * 6px translate + fade as `PageTransition`, so a page that uses both reads
 * as one continuous reveal.
 *
 * For very long lists (>= 12 items) we cap the stagger budget so the last
 * card doesn't take a full second to appear — sub-frame staggers feel
 * cheap, but you don't want the user staring at a half-loaded grid.
 */
interface StaggeredRevealProps {
  children: ReactNode;
  /** ms between consecutive children. Defaults to 40ms. */
  step?: number;
  /** Hard cap on the cumulative delay. Defaults to 240ms (≈6 children). */
  maxDelay?: number;
  className?: string;
  /** Element used as the flex/grid container. Defaults to a plain Box. */
  component?: React.ElementType;
}

interface ItemProps {
  entered: boolean;
  skipAnimation: boolean;
  delay: number;
}

// Important: `display: contents` would skip the wrapper from layout entirely
// (cleanest for grid parents that want their grandchildren to be tracks), but
// then `opacity`/`transform` no longer apply — block-level containers must
// own a generated box for transforms to take effect. So we keep the wrapper
// as a real flex/grid child and explicitly stretch it so children like
// `<button>` (which shrink to content by default) fill the parent track.
const Item = styled(Box, {
  shouldForwardProp: (p) => p !== "entered" && p !== "skipAnimation" && p !== "delay",
})<ItemProps>(({ entered, skipAnimation, delay }) => ({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
  // When the parent is a CSS grid, `align-self: stretch` is the default —
  // but only if the item itself doesn't have a fixed height. Forcing
  // `height: 100%` keeps the wrapper transparent for grid sizing too, so
  // a child KpiButton spans the full grid track AND track height.
  "& > *": { flex: 1, width: "100%", minWidth: 0 },
  opacity: skipAnimation ? 1 : entered ? 1 : 0,
  transform: skipAnimation ? "none" : entered ? "translate3d(0, 0, 0)" : "translate3d(0, 6px, 0)",
  transition: skipAnimation
    ? "none"
    : `opacity 200ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 220ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
  willChange: skipAnimation ? "auto" : "opacity, transform",
}));

function StaggeredReveal({
  children,
  step = 40,
  maxDelay = 240,
  className,
  component,
}: StaggeredRevealProps) {
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  const arr = Children.toArray(children);

  return (
    <Box component={component ?? "div"} className={className}>
      {arr.map((child, i) => {
        const delay = Math.min(maxDelay, step * i);
        const key = isValidElement(child) && child.key != null ? child.key : i;
        return (
          <Item
            key={key}
            entered={entered}
            skipAnimation={reduced}
            delay={delay}
            data-stagger-index={i}
          >
            {child}
          </Item>
        );
      })}
    </Box>
  );
}

export default StaggeredReveal;
