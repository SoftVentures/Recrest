import { type RefObject, useEffect, useRef } from "react";

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
 *
 * I10: the hook also owns a `scroll` listener on the target so a
 * "last-known position" is tracked while the consumer is mounted. If the
 * scrollable element unmounts before the page itself, the cleanup writes
 * that latched value rather than falling back to `window.scrollY` (which
 * would persist the wrong number — e.g. zero, when the parent page has
 * never scrolled).
 */
const STORAGE_PREFIX = "recrest:scroll:";

export function useScrollRestoration<T extends HTMLElement>(
  pageId: string,
  ref?: RefObject<T | null>,
): void {
  // Latest observed scroll position. Updated on every `scroll` tick of the
  // tracked target — the cleanup writes this value instead of polling
  // `ref.current` (which may already be null when the cleanup runs).
  const lastPosRef = useRef<number | null>(null);

  useEffect(() => {
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

    // Throttle the scroll-position pin to one update per animation frame.
    // Without throttling we'd write to a ref on every wheel/touchmove tick,
    // which is harmless but wasteful for an unbounded list.
    let pinScheduled = false;
    const readCurrent = (): number => {
      const el = refSnapshot?.current;
      return el ? el.scrollTop : window.scrollY;
    };
    const onScroll = () => {
      if (pinScheduled) return;
      pinScheduled = true;
      requestAnimationFrame(() => {
        pinScheduled = false;
        lastPosRef.current = readCurrent();
      });
    };

    // Seed the latched value with the pre-restore reading so the cleanup
    // has a non-null fallback even if the user never scrolls.
    lastPosRef.current = readCurrent();

    const target: HTMLElement | Window = refSnapshot?.current ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      target.removeEventListener("scroll", onScroll);

      // Persist the last *observed* position. If the scrollable element
      // has already unmounted by the time this cleanup runs, the ref's
      // current is null — falling back to `window.scrollY` here would
      // give a wrong value (typically zero) and overwrite a perfectly
      // good remembered position. Use the latched value instead.
      const value = lastPosRef.current ?? readCurrent();
      try {
        sessionStorage.setItem(key, String(Math.round(value)));
      } catch {
        // sessionStorage can throw under quota or in private modes — failing
        // to remember scroll is non-load-bearing, so swallow.
      }
    };
  }, [pageId, ref]);
}
