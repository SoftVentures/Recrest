import { useEffect } from "react";

/**
 * Opt the current page out of the AppLayout's default scroll container.
 *
 * Most pages let `AppLayout`'s `ContentScroll` element handle scrolling — that
 * keeps the scrollbar flush against the viewport edge and prevents a competing
 * inner scroller from flickering in/out during the page-enter animation.
 * Pages that own a multi-pane layout (e.g. Settings with a sticky tab-nav and
 * a scrolling body) need to neutralise the outer scroller so they don't end
 * up with two scrollbars stacked.
 *
 * Mirrors the src-old `:has()`-based escape hatch
 * (`.a-content-scroll:has(> .a-content > .a-settings) { overflow: hidden }`)
 * via a data attribute we can target from emotion `styled()` selectors.
 */
export function useFullbleedScroll(): void {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-content-scroll]");
    if (!el) return;
    el.setAttribute("data-fullbleed", "true");
    return () => {
      el.removeAttribute("data-fullbleed");
    };
  }, []);
}
