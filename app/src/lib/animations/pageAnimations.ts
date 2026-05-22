import { keyframes } from "@mui/material/styles";

/**
 * Shared mount-animation primitives — direct port of `src-old/styles/page-anim.scss`.
 *
 * Each page composes these keyframes onto its toolbar / row / card sub-trees
 * to produce a layered enter animation: toolbar drops in (pgFall), rows slide
 * from the left (pgSlideL), cards rise (pgRise), etc.
 *
 * **Why CSS keyframes (not React state):** keyframes run on the compositor
 * regardless of React render timing, so they fire instantly on mount even
 * when the page has heavy initial work. JS-driven transitions with a
 * `requestAnimationFrame` toggle stutter on the first frame of a route swap
 * because the JS thread is busy with the route's data thunks.
 *
 * **Reduced motion:** every consumer must guard with the
 * `[data-reduced-motion="true"]` selector — see `prefersReducedMotionGuard`
 * below for the canonical override block.
 */

export const PAGE_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
export const PAGE_DUR_SM = 320;
export const PAGE_DUR_MD = 440;
export const PAGE_DUR_LG = 620;
export const PAGE_STAGGER = 60;

export const pgRise = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
`;

export const pgFall = keyframes`
  from { opacity: 0; transform: translateY(-14px); }
  to   { opacity: 1; transform: none; }
`;

// pgSlideL starts at 0.4 opacity (not 0) so mid-stagger frames stay legible
// when many rows compound the per-row delay — matches src-old's tuned variant.
export const pgSlideL = keyframes`
  from { opacity: 0.4; transform: translateX(-12px); }
  to   { opacity: 1; transform: none; }
`;

export const pgSlideR = keyframes`
  from { opacity: 0; transform: translateX(18px); }
  to   { opacity: 1; transform: none; }
`;

export const pgZoom = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: none; }
`;

export const pgStripe = keyframes`
  from { opacity: 0; transform: scaleY(0); transform-origin: top; }
  to   { opacity: 1; transform: scaleY(1); }
`;

/**
 * Drop-in CSS object for any styled rule that runs a page-enter keyframe.
 * Spread on the same level as the `animation` declaration so the override
 * fires whenever the user has reduce-motion on (OS or settings toggle).
 */
export const prefersReducedMotionGuard = {
  'html[data-reduced-motion="true"] &': {
    animation: "none !important",
  },
} as const;

/**
 * Build a `&:nth-of-type(N) { animation-delay: … }` block for the first
 * `count` siblings. Past `count`, every later sibling reuses the last
 * computed delay so a 300-row table doesn't tween for ten seconds.
 *
 * Used by list pages (Repos rows, Branches groups, MR rows) to mirror the
 * src-old `--i`/`--gi` custom-property staggers without having to thread
 * an index prop through every component.
 */
export function staggerNthOfType(opts: {
  step: number;
  count?: number;
  base?: number;
  selector?: string;
}): Record<string, { animationDelay: string }> {
  const { step, count = 12, base = 0, selector = "&" } = opts;
  const out: Record<string, { animationDelay: string }> = {};
  for (let i = 1; i <= count; i++) {
    out[`${selector}:nth-of-type(${i})`] = {
      animationDelay: `${base + step * (i - 1)}ms`,
    };
  }
  out[`${selector}:nth-of-type(n + ${count + 1})`] = {
    animationDelay: `${base + step * (count - 1)}ms`,
  };
  return out;
}
