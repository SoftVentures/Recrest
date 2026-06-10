import { type RefObject, useEffect, useState } from "react";

/**
 * Scale factor that fits a fixed-width virtual desktop into `ref`'s width.
 * The demo iframe always renders at the app's comfortable desktop size and
 * is visually scaled down, so the embedded app never sees a tiny viewport.
 */
export function useDemoScale(ref: RefObject<HTMLElement | null>, baseWidth: number): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(width / baseWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, baseWidth]);
  return scale;
}
