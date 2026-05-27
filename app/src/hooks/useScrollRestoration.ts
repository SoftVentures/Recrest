import { type RefObject, useEffect, useRef } from "react";

import { storageKeyForScroll } from "@/lib/constants/storage.constants";

/**
 * Remembers a page's scroll position across mounts.
 *
 * On unmount, writes the scrollable element's `scrollTop` to
 * `sessionStorage` under a per-page key. On mount, restores that value
 * before the next paint so the user lands where they left.
 *
 * Pass either a ref (preferred — restores precise scroll for any container)
 * or omit `ref` to fall back to `window.scrollY`.
 *
 * Storage uses `sessionStorage` (not `localStorage`) so positions reset
 * between sessions — restoring last week's scroll position would be more
 * confusing than helpful.
 */
export function useScrollRestoration<T extends HTMLElement>(
  pageId: string,
  ref?: RefObject<T | null>,
): void {
  const lastPosRef = useRef<number | null>(null);

  useEffect(() => {
    const refSnapshot = ref;
    const key = storageKeyForScroll(pageId);
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(key);
    } catch {
      raw = null;
    }
    const saved = raw == null ? null : Number.parseInt(raw, 10);
    const top = saved == null || Number.isNaN(saved) ? null : saved;

    let raf = 0;
    if (top != null) {
      raf = requestAnimationFrame(() => {
        const el = refSnapshot?.current;
        if (el) el.scrollTop = top;
        else window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
      });
    }

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

    lastPosRef.current = readCurrent();

    const target: HTMLElement | Window = refSnapshot?.current ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      target.removeEventListener("scroll", onScroll);
      const value = lastPosRef.current ?? readCurrent();
      try {
        sessionStorage.setItem(key, String(Math.round(value)));
      } catch {
        /* sessionStorage may be unavailable in private mode */
      }
    };
  }, [pageId, ref]);
}
