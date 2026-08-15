import { type ReactNode, useEffect, useRef, useState } from "react";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { ChevronDown, ChevronUp } from "lucide-react";

import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

interface ExpandableContentProps {
  children: ReactNode;
  /** Height (px) at which the content gets fade-clipped when collapsed.
   *  ~10 lines of body text at 13px/1.6 line-height ≈ 210px. */
  collapsedHeight?: number;
  showMoreLabel: string;
  showLessLabel: string;
  /** Forwarded as the data-testid of the toggle button. */
  toggleTestId?: string;
}

/** Renders arbitrary content, soft-clipped to `collapsedHeight` with a fade
 *  mask and a "Show more / Show less" toggle. Measures its own intrinsic
 *  height after mount and only shows the toggle when the content actually
 *  overflows — short bodies render normally without the chrome. */
function ExpandableContent({
  children,
  collapsedHeight = 220,
  showMoreLabel,
  showLessLabel,
  toggleTestId,
}: ExpandableContentProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Measure intrinsic height (clientHeight on the unconstrained inner node) so
  // we know whether to surface the toggle at all. Re-measure on resize so
  // collapsing a side-panel or zooming the OS doesn't strand us in the wrong
  // state.
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const measure = () => setOverflows(node.scrollHeight > collapsedHeight + 12);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [collapsedHeight, children]);

  const clipped = overflows && !expanded;

  return (
    <Root>
      <Clip maxH={clipped ? collapsedHeight : null}>
        <Inner ref={contentRef}>{children}</Inner>
        {clipped && <Fade />}
      </Clip>
      {overflows && (
        <ToggleRow>
          <Toggle type="button" onClick={() => setExpanded((v) => !v)} data-testid={toggleTestId}>
            {expanded ? <ChevronUp size={pxToRem(13)} /> : <ChevronDown size={pxToRem(13)} />}
            <Typography component="span" variant="caption">
              {expanded ? showLessLabel : showMoreLabel}
            </Typography>
          </Toggle>
        </ToggleRow>
      )}
    </Root>
  );
}

const Root = styled(Box)({
  position: "relative",
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

const Clip = styled(Box, { shouldForwardProp: (p) => p !== "maxH" })<{ maxH: number | null }>(
  ({ maxH }) => ({
    position: "relative",
    overflow: "hidden",
    maxHeight: maxH ?? "none",
    transition: "max-height 200ms ease",
  }),
);

const Inner = styled(Box)({}) as typeof Box;

const Fade = styled(Box)(({ theme }) => ({
  position: "absolute",
  insetInline: 0,
  bottom: 0,
  height: pxToRem(64),
  pointerEvents: "none",
  background: `linear-gradient(to bottom, transparent, ${theme.palette.background.paper} 90%)`,
})) as typeof Box;

const ToggleRow = styled(Box)({
  display: "flex",
  justifyContent: "center",
  marginTop: pxToRem(6),
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required: ghost toggle with keyboard focus that lives inside Description body
const Toggle = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: pxToRems(4, 8),
  borderRadius: 6,
  color: theme.palette.text.information,
  fontFamily: "inherit",
  fontSize: fontPxToRem(11.5),
  fontWeight: 600,
  "&:hover": {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.surface.interface.active,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1,
  },
}));

export default ExpandableContent;
