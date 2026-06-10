import { type ReactNode, useCallback, useLayoutEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Body-portalled hover tooltip for the activity charts.
 *
 * Nivo renders its built-in tooltip in-flow inside the chart container, so it
 * gets clipped by the page's `overflow: auto` scroll area on the left edge and
 * painted behind neighbouring cards / the sidebar on the right. Portalling to
 * `document.body` with a high z-index lifts it above everything and escapes the
 * clip. Charts pass `tooltip={() => <></>}` to Nivo and drive this via their
 * mouse handlers instead.
 *
 * Positioning is measured *after* layout (in `useLayoutEffect`, before paint):
 * we read the rendered box's real size and flip it to the other side of the
 * cursor only when it would actually overflow. The earlier version guessed an
 * upper-bound width and parked narrow tooltips far to the left of the pointer
 * near the right edge — that's the "tooltip is somewhere else entirely" bug.
 *
 * `@nivo/bar` only exposes `onMouseEnter`/`onMouseLeave` (no `onMouseMove`), so
 * bar charts feed `move()` from their wrapper `<Box onMouseMove>` to make the
 * tooltip track the cursor instead of freezing at the bar's entry edge.
 */
const Layer = styled(Box)({
  position: "fixed",
  // Above the sidebar, app bar, drawers and modals — this is chrome-on-top.
  zIndex: 100000,
  pointerEvents: "none",
});

const GAP = 14;
const EDGE = 8;

export function useChartTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; node: ReactNode } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !tip) return;
    const { width, height } = el.getBoundingClientRect();
    let left = tip.x + GAP;
    if (left + width > window.innerWidth - EDGE) left = tip.x - GAP - width;
    if (left < EDGE) left = EDGE;
    let top = tip.y + GAP;
    if (top + height > window.innerHeight - EDGE) top = tip.y - GAP - height;
    if (top < EDGE) top = EDGE;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [tip]);

  const show = useCallback(
    (clientX: number, clientY: number, node: ReactNode) => setTip({ x: clientX, y: clientY, node }),
    [],
  );

  // Reposition an already-visible tooltip without changing its content.
  const move = useCallback(
    (clientX: number, clientY: number) =>
      setTip((prev) => (prev ? { ...prev, x: clientX, y: clientY } : prev)),
    [],
  );

  const hide = useCallback(() => setTip(null), []);

  const portal =
    tip != null
      ? createPortal(
          <Layer ref={ref} style={{ left: tip.x + GAP, top: tip.y + GAP }}>
            {tip.node}
          </Layer>,
          document.body,
        )
      : null;

  return { show, move, hide, portal };
}
