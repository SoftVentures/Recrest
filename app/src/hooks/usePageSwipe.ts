import { useEffect } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { AppRoute, type AppRoutePath } from "@recrest/shared";

import { useDrag } from "@use-gesture/react";

const ROUTE_ORDER: AppRoutePath[] = [
  AppRoute.ACTIVITY,
  AppRoute.REPOS,
  AppRoute.MERGE_REQUESTS,
  AppRoute.BRANCHES,
];

interface PageSwipeOptions {
  threshold?: number;
  enabled?: boolean;
}

/**
 * Document-level horizontal swipe nav. Right swipe = previous page,
 * left swipe = next page within ROUTE_ORDER. Mouse drags are ignored.
 */
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
      if (idx < 0) return;
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
