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
    // We attach use-gesture's listeners by hand (see below) and drop the
    // `style`/`touchAction` it would normally hand back via the spread props,
    // so the browser keeps `touch-action: auto` and use-gesture warns. For an
    // x-axis swipe the faithful value is `pan-y` — it captures the horizontal
    // drag while leaving vertical scroll/pinch-zoom to the browser. `none`
    // (what the raw warning suggests) would kill scrolling on the whole page.
    const previousTouchAction = target.style.touchAction;
    target.style.touchAction = "pan-y";
    const props = bind() as Record<string, EventListenerOrEventListenerObject>;
    const subs: Array<() => void> = [() => (target.style.touchAction = previousTouchAction)];
    for (const [key, handler] of Object.entries(props)) {
      if (!key.startsWith("on") || typeof handler !== "function") continue;
      const evt = key.slice(2).toLowerCase();
      const listener = handler as EventListener;
      // Page-swipe is a navigation gesture for page content. Modal / drawer
      // overlays render via React portal at the document.body level too, so
      // without a target filter use-gesture's pointer listener on `body`
      // captures the pointer (`setPointerCapture`) for any tap inside an
      // overlay — which suppresses the underlying button's click and
      // pointerup events. The Onboarding "Connect" button and the browser's
      // built-in password-reveal eye both surface this. Skipping events that
      // originated inside any `role="dialog"` subtree keeps the swipe-nav
      // intact for page content while leaving overlay interactions alone.
      const guarded: EventListener = (e) => {
        const origin = e.target as HTMLElement | null;
        if (origin?.closest('[role="dialog"]')) return;
        try {
          listener(e);
        } catch (err) {
          // use-gesture occasionally throws `InvalidStateError` from
          // `setPointerCapture` when the pointerdown target has been
          // detached mid-gesture (modal close, route change, focus flip
          // during Stage Manager). The throw bubbles up to a window
          // `onerror`, which makes the dev log look like something broke
          // even though the gesture is just no-oping. Swallow the
          // documented benign case; rethrow anything else.
          if (!(err instanceof DOMException && err.name === "InvalidStateError")) {
            throw err;
          }
        }
      };
      target.addEventListener(evt, guarded, { passive: true });
      subs.push(() => target.removeEventListener(evt, guarded));
    }
    return () => subs.forEach((u) => u());
  }, [bind, enabled]);
}
