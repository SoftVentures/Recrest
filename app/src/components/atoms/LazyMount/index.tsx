import { type ReactNode, useEffect, useRef, useState } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

interface Props {
  /** Reserved height of the placeholder so the grid layout doesn't collapse
   *  before the real content mounts. */
  minHeight: number;
  children: ReactNode;
}

const Placeholder = styled(Box, { shouldForwardProp: (p) => p !== "minHeight" })<{
  minHeight: number;
}>(({ minHeight }) => ({
  minHeight,
  width: "100%",
}));

/**
 * Defers mounting `children` until the slot scrolls near the viewport, then
 * keeps them mounted. The activity page renders ~12 Nivo charts plus a long
 * history feed; mounting the below-the-fold ones eagerly made every range
 * switch re-render the whole tree synchronously (a ~1.8s INP). Gating offscreen
 * cards behind an IntersectionObserver cuts that to just the visible cards and
 * speeds the initial paint. Falls back to eager mount when IntersectionObserver
 * is unavailable (jsdom/tests, old runtimes).
 */
export default function LazyMount({ minHeight, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      // Mount a bit before the slot enters the viewport so there's no flash.
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  if (visible) return <>{children}</>;
  return <Placeholder ref={ref} minHeight={minHeight} />;
}
