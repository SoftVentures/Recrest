import { forwardRef } from "react";

import { useTranslation } from "react-i18next";

import { Button, type ButtonProps as MuiButtonProps } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Check as CheckIcon, X as ErrorIcon } from "lucide-react";

import VisuallyHidden from "@/components/atoms/layout/VisuallyHidden";
import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import type { ActionFeedbackState } from "@/lib/utils/useActionFeedback";

export type GeneralButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type GeneralButtonSize = "default" | "sm" | "lg";

export interface GeneralButtonProps extends Omit<MuiButtonProps, "variant" | "size" | "color"> {
  variant?: GeneralButtonVariant;
  size?: GeneralButtonSize;
  loading?: boolean;
  /**
   * Transient one-shot feedback state for the trigger (idle/loading/success/error).
   * When set to anything other than `"idle"`, replaces the `startIcon`:
   *
   * - `"loading"` → inline spinner (also disables the button)
   * - `"success"` → green check
   * - `"error"`   → red cross
   *
   * Drive this from `useActionFeedback().state`; the hook auto-reverts to idle.
   */
  feedbackState?: ActionFeedbackState;
}

interface StyledButtonProps {
  variantKind?: GeneralButtonVariant;
  feedbackKind?: ActionFeedbackState;
}

function mapVariant(variant: GeneralButtonVariant): {
  muiVariant: MuiButtonProps["variant"];
  muiColor: MuiButtonProps["color"];
} {
  switch (variant) {
    case "destructive":
      return { muiVariant: "contained", muiColor: "error" };
    case "outline":
      return { muiVariant: "outlined", muiColor: "primary" };
    case "secondary":
      return { muiVariant: "contained", muiColor: "secondary" };
    case "ghost":
      return { muiVariant: "text", muiColor: "inherit" };
    case "link":
      return { muiVariant: "text", muiColor: "primary" };
    case "default":
    default:
      return { muiVariant: "contained", muiColor: "primary" };
  }
}

function mapSize(size: GeneralButtonSize): MuiButtonProps["size"] {
  if (size === "sm") return "small";
  if (size === "lg") return "large";
  return "medium";
}

const StyledButton = styled(Button, {
  shouldForwardProp: (p) => p !== "variantKind" && p !== "feedbackKind",
})<StyledButtonProps>(({ theme, variantKind, feedbackKind }) => ({
  textTransform: "none",
  transition:
    "background-color 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease",
  ...(variantKind === "link"
    ? {
        textDecoration: "underline",
        "&:hover": { textDecoration: "underline" },
      }
    : {}),
  // Feedback states own the whole surface — full bg colour for unmistakable status.
  ...(feedbackKind === "success" && {
    "&&": {
      backgroundColor: theme.palette.success.main,
      borderColor: theme.palette.success.main,
      color: theme.palette.success.contrastText,
      "&:hover": {
        backgroundColor: theme.palette.success.dark,
        borderColor: theme.palette.success.dark,
      },
      "&.Mui-disabled": {
        backgroundColor: theme.palette.success.main,
        borderColor: theme.palette.success.main,
        color: theme.palette.success.contrastText,
        opacity: 1,
      },
    },
  }),
  ...(feedbackKind === "error" && {
    "&&": {
      backgroundColor: theme.palette.error.main,
      borderColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      "&:hover": {
        backgroundColor: theme.palette.error.dark,
        borderColor: theme.palette.error.dark,
      },
      "&.Mui-disabled": {
        backgroundColor: theme.palette.error.main,
        borderColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        opacity: 1,
      },
    },
  }),
}));

// In feedback states the icons live on a coloured background — inherit colour
// so they read white/contrast against green/red.
const SuccessIcon = styled(CheckIcon)({ color: "inherit" });
const FailureIcon = styled(ErrorIcon)({ color: "inherit" });

const GeneralButton = forwardRef<HTMLButtonElement, GeneralButtonProps>(function GeneralButton(
  {
    variant = "default",
    size = "default",
    loading = false,
    feedbackState = "idle",
    disabled,
    children,
    startIcon,
    ...rest
  },
  ref,
) {
  const { muiVariant, muiColor } = mapVariant(variant);
  const { t } = useTranslation(I18nNamespace.ARIA);
  const isLoading = loading || feedbackState === "loading";
  let effectiveStartIcon = startIcon;
  if (isLoading) {
    effectiveStartIcon = (
      <GeneralCircularLoader size={CircularLoaderSize.SM} color="inherit" aria-hidden="true" />
    );
  } else if (feedbackState === "success") {
    effectiveStartIcon = <SuccessIcon size={16} aria-hidden="true" />;
  } else if (feedbackState === "error") {
    effectiveStartIcon = <FailureIcon size={16} aria-hidden="true" />;
  }
  let liveText = "";
  if (isLoading) liveText = t("feedback.loading");
  else if (feedbackState === "success") liveText = t("feedback.success");
  else if (feedbackState === "error") liveText = t("feedback.error");
  return (
    <StyledButton
      ref={ref}
      variantKind={variant}
      feedbackKind={feedbackState}
      variant={muiVariant}
      color={muiColor}
      size={mapSize(size)}
      disabled={disabled || isLoading}
      startIcon={effectiveStartIcon}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {children}
      <VisuallyHidden aria-live="polite">{liveText}</VisuallyHidden>
    </StyledButton>
  );
});

export default GeneralButton;
