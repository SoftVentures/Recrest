import { type RefObject, useEffect } from "react";

export function useParallax(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;

    const apply = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = Math.max(-0.4, Math.min(0.6, (vh - rect.top) / (vh + rect.height) - 0.5));
      el.style.setProperty("--parallax", `${(progress * -24).toFixed(1)}px`);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(apply);
        ticking = true;
      }
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", apply);
    };
  }, [ref]);
}
