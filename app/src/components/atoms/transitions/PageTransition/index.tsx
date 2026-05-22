import { type ReactNode, useLayoutEffect, useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Page-level enter animation. Fades + translates up by 6px over 200ms; honours
 * `useReducedMotion` (= explicit Settings toggle ∪ OS media query) by skipping
 * the animation entirely and showing the page in its final state. Single
 * tween, no library — emotion `styled()` + a one-shot `data-entered` flag.
 *
 * The animation fires on every mount, which is the natural unit for
 * react-router page swaps. Children that animate further internally (skeleton
 * → real content) handle that separately; PageTransition only owns the
 * page-shell enter.
 */
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  /** Delay before the enter animation starts. Tiny defaults (0–60ms) help
   *  pages that mount inside an outer transition feel smoother. */
  delay?: number;
}

const Root = styled(Box, {
  shouldForwardProp: (p) => p !== "entered" && p !== "skipAnimation" && p !== "delay",
})<{ entered: boolean; skipAnimation: boolean; delay: number }>(
  ({ entered, skipAnimation, delay }) => ({
    // `height: 100%` (not `minHeight`) so PageTransition exactly fills its
    // scroll parent — Settings' 2-pane layout reads `height: 100%` off this
    // element and needs a deterministic anchor. Pages that need to scroll
    // (Activity, Branches, Repos) own their own internal scroller and let
    // the outer ContentScroll stay quiet — see each page's Root styling.
    height: "100%",
    minHeight: 0,
    width: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    opacity: skipAnimation ? 1 : entered ? 1 : 0,
    transform: skipAnimation
      ? "none"
      : entered
        ? "translate3d(0, 0, 0)"
        : "translate3d(0, 10px, 0)",
    // Slightly longer + softer than the previous 200/220ms — the old timing
    // was so short the animation read as a hard pop. 320ms with an
    // ease-out-back-ish curve gives the page time to settle visibly.
    transition: skipAnimation
      ? "none"
      : `opacity 320ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms, transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
    willChange: skipAnimation ? "auto" : "opacity, transform",
  }),
);

function PageTransition({ children, className, delay = 0 }: PageTransitionProps) {
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState(false);

  // useLayoutEffect so the initial paint always happens with opacity:0 →
  // first commit + transition kicks in on the next frame. useEffect would
  // race the browser and occasionally let the destination state slip through.
  useLayoutEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  return (
    <Root
      className={className}
      entered={entered}
      skipAnimation={reduced}
      delay={delay}
      data-entered={entered ? "true" : "false"}
    >
      {children}
    </Root>
  );
}

export default PageTransition;
