import { type RefObject, useEffect } from "react";

import { useDrag } from "@use-gesture/react";

interface DrawerSwipeOptions {
  /** Drawer DOM node — gesture is bound to it directly. */
  ref: RefObject<HTMLElement | null>;
  /** Called when the user swipes far enough to dismiss. */
  onClose: () => void;
  /** Disable the gesture entirely (e.g. when drawer is closed). */
  enabled?: boolean;
  /** Swipe direction that closes — defaults to "right" so right-side
   *  drawers close by swiping back toward the screen edge. */
  direction?: "right" | "left";
  /** Pixel threshold a drag must clear to count as a close gesture. */
  threshold?: number;
}

/** D.5: dismisses a side drawer when the user swipes it toward its origin
 *  edge. Skips mouse pointers so a stray click-drag on desktop never
 *  unmounts the drawer mid-interaction — only touch input triggers it. */
export function useDrawerSwipe({
  ref,
  onClose,
  enabled = true,
  direction = "right",
  threshold = 50,
}: DrawerSwipeOptions): void {
  // useDrag wires up its own listeners via a setter the hook returns.
  // Calling that setter inside an effect attaches them to the live ref.
  const bind = useDrag(
    ({ event, last, movement: [mx], velocity: [vx], direction: [dx] }) => {
      // useDrag normalises mouse + touch + pen events but doesn't surface
      // the pointer type directly; sniff it off the underlying event so
      // mouse drags don't trigger a drawer dismiss on desktop.
      const pointerType = (event as PointerEvent | TouchEvent | MouseEvent | undefined)?.type ?? "";
      const isMouse =
        (event as PointerEvent | undefined)?.pointerType === "mouse" ||
        pointerType.startsWith("mouse");
      if (isMouse) return;
      if (!last) return;
      const movedFarEnough = Math.abs(mx) > threshold;
      const flickedFarEnough = Math.abs(vx) > 0.4;
      if (!movedFarEnough && !flickedFarEnough) return;
      // Close when the dominant axis matches the drawer's open-edge.
      const goingRight = dx > 0 || mx > 0;
      const goingLeft = dx < 0 || mx < 0;
      if (direction === "right" && goingRight) onClose();
      else if (direction === "left" && goingLeft) onClose();
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } },
  );

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;
    // `bind()` returns the same prop bag we'd spread onto JSX. Apply each
    // event listener manually so the consumer doesn't need to wire props.
    const props = bind() as Record<string, EventListenerOrEventListenerObject>;
    const subscriptions: Array<() => void> = [];
    for (const [key, handler] of Object.entries(props)) {
      if (!key.startsWith("on") || typeof handler !== "function") continue;
      const evt = key.slice(2).toLowerCase();
      const listener = handler as EventListener;
      node.addEventListener(evt, listener, { passive: true });
      subscriptions.push(() => node.removeEventListener(evt, listener));
    }
    return () => subscriptions.forEach((unbind) => unbind());
    // `bind` is stable per render thanks to useDrag's internal memoisation.
  }, [ref, bind, enabled]);
}
