import { useEffect } from "react";

// `revealKey` re-runs the observer setup whenever the rendered view changes
// (e.g. returning from #/download or a legal route to the home view). Without
// it the hook observes `.reveal` elements only on first mount, so the
// re-mounted home sections would stay at opacity 0 forever after navigating
// back. See landingpage download-route work.
export function useScrollReveal(selector = ".reveal", revealKey?: unknown): void {
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = document.querySelectorAll<HTMLElement>(selector);

    if (reduced || !("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selector, revealKey]);
}
