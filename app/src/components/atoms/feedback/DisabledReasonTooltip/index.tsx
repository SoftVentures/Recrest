import type { ElementType, ReactElement } from "react";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";

export interface DisabledReasonTooltipProps {
  /** Why the wrapped control is unavailable. Pass `null`/`false` while the
   *  control is usable. */
  reason: string | null | false;
  /** Tooltip shown while the control is usable. Omit for no tooltip at all. */
  title?: string;
  /** Let the wrapper inherit a `flex: 1` slot, so wrapping a stretched button
   *  doesn't collapse it to its intrinsic width. */
  stretch?: boolean;
  children: ReactElement;
}

interface AnchorProps {
  $stretch: boolean;
  /** `styled()` erases Box's polymorphic `component` overload, so the prop has
   *  to be re-declared here — the anchor must render as a `<span>` to stay
   *  legal inside the inline rows that wrap their buttons in it. */
  component?: ElementType;
}

const TooltipAnchor = styled(Box, {
  shouldForwardProp: (p) => p !== "$stretch",
})<AnchorProps>(({ $stretch }) => ({
  display: "inline-flex",
  // `minWidth: 0` lets the anchor shrink below its content in a flex row, so a
  // long label inside the wrapped control can still ellipsize.
  minWidth: 0,
  ...($stretch ? { flex: 1 } : {}),
}));

/**
 * Explains why a control is disabled. A disabled `<button>` swallows pointer
 * events, so MUI can only anchor a tooltip on an enabled wrapper — hence the
 * `<span>`. It is only added while a reason exists, keeping the DOM unchanged
 * in the ordinary enabled case.
 */
function DisabledReasonTooltip({ reason, title, stretch, children }: DisabledReasonTooltipProps) {
  if (!reason) {
    if (!title) return children;
    return <GeneralTooltip title={title}>{children}</GeneralTooltip>;
  }
  return (
    <GeneralTooltip title={reason}>
      <TooltipAnchor component="span" $stretch={stretch ?? false}>
        {children}
      </TooltipAnchor>
    </GeneralTooltip>
  );
}

export default DisabledReasonTooltip;
