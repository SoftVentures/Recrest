import { useEffect } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { useDrag } from "@use-gesture/react";

import { AppRoute, type AppRoutePath } from "@recrest/shared";

/** D.5: ordered list of top-level pages that participate in horizontal-swipe
 *  navigation. Two documented use-cases for this hook:
 *
 *   1. **Dashboard tablet/mobile flow** — quick swipe between Activity →
 *      Repos → MRs → Branches without lifting fingers off the screen.
 *      The order tracks the most-used flow: "what changed today" →
 *      "where did it land" → "open reviews" → "branches awaiting cleanup".
 *
 *   2. **Demo / video walkthroughs** — repeatable left-to-right scroll
 *      through the dashboard, repo browser, MRs and branches without a
 *      keyboard. Useful for marketing captures that need a calm,
 *      single-touch path. */
const ROUTE_ORDER: AppRoutePath[] = [
  AppRoute.ACTIVITY,
  AppRoute.REPOS,
  AppRoute.MERGE_REQUESTS,
  AppRoute.BRANCHES,
];

interface PageSwipeOptions {
  /** Pixel threshold below which the swipe is ignored. */
  threshold?: number;
  /** Disable temporarily (e.g. while a drawer owns the gesture). */
  enabled?: boolean;
}

/** Listens for horizontal touch swipes on the document body and navigates
 *  forward/backward through `ROUTE_ORDER`. Mouse drags are ignored.
 *
 *  The hook deliberately attaches at the document level rather than
 *  through props on a particular layout container so the page stack
 *  doesn't have to thread refs through every page. The cost is one
 *  global handler per session; it's removed cleanly on unmount. */
export function usePageSwipe({ threshold = 80, enabled = true }: PageSwipeOptions = {}): void {
  const navigate = useNavigate();
  const location = useLocation();

  const bind = useDrag(
    ({ event, last, movement: [mx], velocity: [vx], direction: [dx] }) => {
      const pointerType = (event as PointerEvent | TouchEvent | MouseEvent | undefined)?.type ?? "";
      const isMouse =
        (event as PointerEvent | undefined)?.pointerType === "mouse" ||
        pointerType.startsWith("mouse");
      if (isMouse) return;
      if (!last) return;
      const movedFar = Math.abs(mx) > threshold;
      const flicked = Math.abs(vx) > 0.4;
      if (!movedFar && !flicked) return;
      const idx = ROUTE_ORDER.indexOf(location.pathname as AppRoutePath);
      if (idx < 0) return; // page not in the swipe ring — silently ignore
      // Right swipe = go to the *previous* page (consistent with iOS' back
      // gesture); left swipe = forward.
      const next = dx > 0 || mx > 0 ? idx - 1 : idx + 1;
      if (next < 0 || next >= ROUTE_ORDER.length) return;
      navigate(ROUTE_ORDER[next]!);
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } },
  );

  useEffect(() => {
    if (!enabled) return;
    const target = document.body;
    if (!target) return;
    const props = bind() as Record<string, EventListenerOrEventListenerObject>;
    const subs: Array<() => void> = [];
    for (const [key, handler] of Object.entries(props)) {
      if (!key.startsWith("on") || typeof handler !== "function") continue;
      const evt = key.slice(2).toLowerCase();
      const listener = handler as EventListener;
      target.addEventListener(evt, listener, { passive: true });
      subs.push(() => target.removeEventListener(evt, listener));
    }
    return () => subs.forEach((u) => u());
  }, [bind, enabled]);
}
