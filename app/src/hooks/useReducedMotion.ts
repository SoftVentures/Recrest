import { useEffect, useState } from "react";

import { useAppSelector } from "@/store/hooks";

/**
 * Single source of truth for "should we animate?". Honours both:
 *   - the user's explicit toggle in Settings → Accessibility, and
 *   - the OS `prefers-reduced-motion: reduce` media query.
 *
 * Either being true means: skip non-essential animations. Components should
 * branch on this to switch to a one-shot mount instead of a transition, not
 * to a slower transition — a slow animation is still an animation and users
 * who opt out usually want it *gone*, not delayed.
 */
export function useReducedMotion(): boolean {
  const explicit = useAppSelector((s) => s.settings.reducedMotion);
  const [osPref, setOsPref] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setOsPref(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return explicit || osPref;
}
