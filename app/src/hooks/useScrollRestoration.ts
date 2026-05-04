import { type RefObject, useEffect } from "react";

/**
 * Plan 1 §D.7: remember a page's scroll position across mounts.
 *
 * On unmount, writes the scrollable element's `scrollTop` to
 * `sessionStorage` under a per-page key. On mount, restores that value
 * before the next paint so the user lands where they left.
 *
 * Pass either a ref (preferred — restores precise scroll for any container)
 * or omit `ref` to fall back to `window.scrollY`. Returns nothing; the hook
 * only manages side-effects.
 *
 * Storage uses `sessionStorage` (not `localStorage`) so positions reset
 * between sessions — restoring last week's scroll position would be more
 * confusing than helpful.
 */
const STORAGE_PREFIX = "recrest:scroll:";

export function useScrollRestoration<T extends HTMLElement>(
  pageId: string,
  ref?: RefObject<T | null>,
): void {
  useEffect(() => {
    // Snapshot the ref's current target up front so the cleanup callback
    // doesn't read `ref.current` after the consumer has already detached.
    const refSnapshot = ref;
    const key = STORAGE_PREFIX + pageId;
    const raw = sessionStorage.getItem(key);
    const saved = raw == null ? null : Number.parseInt(raw, 10);
    const top = saved == null || Number.isNaN(saved) ? null : saved;

    // Restore — wait one frame so the page has painted its content. If the
    // saved value is null we leave the natural scroll position alone.
    let raf = 0;
    if (top != null) {
      raf = requestAnimationFrame(() => {
        const el = refSnapshot?.current;
        if (el) el.scrollTop = top;
        else window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
      });
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      const el = refSnapshot?.current;
      const value = el ? el.scrollTop : window.scrollY;
      try {
        sessionStorage.setItem(key, String(Math.round(value)));
      } catch {
        // sessionStorage can throw under quota or in private modes — failing
        // to remember scroll is non-load-bearing, so swallow.
      }
    };
  }, [pageId, ref]);
}
