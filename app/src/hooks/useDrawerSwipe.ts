import { type RefObject, useEffect } from "react";

import { useDrag } from "@use-gesture/react";

interface DrawerSwipeOptions {
  ref: RefObject<HTMLElement | null>;
  onClose: () => void;
  enabled?: boolean;
  direction?: "right" | "left";
  threshold?: number;
}

/**
 * Dismisses a side drawer when the user swipes it toward its origin edge.
 * Skips mouse pointers — touch only.
 */
export function useDrawerSwipe({
  ref,
  onClose,
  enabled = true,
  direction = "right",
  threshold = 50,
}: DrawerSwipeOptions): void {
  const bind = useDrag(
    ({ event, last, movement: [mx], velocity: [vx], direction: [dx] }) => {
      const pointerType = (event as PointerEvent | TouchEvent | MouseEvent | undefined)?.type ?? "";
      const isMouse =
        (event as PointerEvent | undefined)?.pointerType === "mouse" ||
        pointerType.startsWith("mouse");
      if (isMouse) return;
      if (!last) return;
      const movedFarEnough = Math.abs(mx) > threshold;
      const flickedFarEnough = Math.abs(vx) > 0.4;
      if (!movedFarEnough && !flickedFarEnough) return;
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
  }, [ref, bind, enabled]);
}
