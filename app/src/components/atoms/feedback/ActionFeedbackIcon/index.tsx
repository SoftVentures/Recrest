import type { ReactNode } from "react";

import { styled } from "@mui/material/styles";

import { Check, X } from "lucide-react";

import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";
import type { ActionFeedbackState } from "@/lib/utils/useActionFeedback";
import { pxToRem } from "@/theme/scale";

const Success = styled(Check)(({ theme }) => ({ color: theme.palette.success.main }));
const Failure = styled(X)(({ theme }) => ({ color: theme.palette.error.main }));

export interface ActionFeedbackIconProps {
  state: ActionFeedbackState;
  /** Glyph rendered while idle — the button's own leading icon. */
  fallback: ReactNode;
  size?: number;
  loaderSize?: CircularLoaderSize;
}

/**
 * Inline leading-glyph for bespoke `styled("button")` triggers that can't take
 * `GeneralButton`'s `feedbackState` prop directly: swaps the idle icon for a
 * spinner / green check / red cross driven by `useActionFeedback().state`.
 * The glyphs are decorative — the button's label text carries the live status.
 */
export function ActionFeedbackIcon({
  state,
  fallback,
  size = 14,
  loaderSize = CircularLoaderSize.XS,
}: ActionFeedbackIconProps) {
  if (state === "loading")
    return <GeneralCircularLoader size={loaderSize} color="inherit" aria-hidden="true" />;
  if (state === "success") return <Success size={pxToRem(size)} aria-hidden="true" />;
  if (state === "error") return <Failure size={pxToRem(size)} aria-hidden="true" />;
  return <>{fallback}</>;
}

export default ActionFeedbackIcon;
