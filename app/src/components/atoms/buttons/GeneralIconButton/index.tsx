import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

import { styled } from "@mui/material/styles";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";

/**
 * Size of the icon-button hitbox. The icon itself sits in the middle — pass
 * the matching `size` to your Lucide icon (see `ICON_BUTTON_ICON_SIZES`).
 *
 * Adding a size: append the literal to the const, add an entry to both records.
 */
export const IconButtonSize = {
  XS: "xs",
  SM: "sm",
  MD: "md",
  LG: "lg",
} as const;

export type IconButtonSize = (typeof IconButtonSize)[keyof typeof IconButtonSize];

/** Pixel hitbox per size. */
export const ICON_BUTTON_HITBOX: Record<IconButtonSize, number> = {
  [IconButtonSize.XS]: 16,
  [IconButtonSize.SM]: 22,
  [IconButtonSize.MD]: 28,
  [IconButtonSize.LG]: 36,
};

/** Suggested icon `size` prop (lucide-react) that visually centres in each hitbox. */
export const ICON_BUTTON_ICON_SIZES: Record<IconButtonSize, number> = {
  [IconButtonSize.XS]: 11,
  [IconButtonSize.SM]: 13,
  [IconButtonSize.MD]: 14,
  [IconButtonSize.LG]: 16,
};

/** Square-shape corner radius per size — a flat 8px reads as a circle on the
 *  smaller hitboxes (8/22 ≈ 36%, 8/16 = 50%), so we scale it. */
const ICON_BUTTON_SQUARE_RADII: Record<IconButtonSize, number> = {
  [IconButtonSize.XS]: 4,
  [IconButtonSize.SM]: 5,
  [IconButtonSize.MD]: 6,
  [IconButtonSize.LG]: 8,
};

export const IconButtonVariant = {
  /** Transparent surface, hover changes icon colour only. */
  GHOST: "ghost",
  /** Transparent surface, hover adds a subtle background tint. Default. */
  SUBTLE: "subtle",
  /** Persistent border, hover lifts background + border. */
  OUTLINE: "outline",
} as const;

export type IconButtonVariant = (typeof IconButtonVariant)[keyof typeof IconButtonVariant];

export const IconButtonShape = {
  /** Pill / round button — fits free-floating clear/close glyphs. */
  CIRCLE: "circle",
  /** Rounded-square — fits toolbar rows / chrome buttons. */
  SQUARE: "square",
} as const;

export type IconButtonShape = (typeof IconButtonShape)[keyof typeof IconButtonShape];

export const IconButtonTone = {
  NEUTRAL: "neutral",
  PRIMARY: "primary",
  DANGER: "danger",
} as const;

export type IconButtonTone = (typeof IconButtonTone)[keyof typeof IconButtonTone];

interface RootProps {
  $size: IconButtonSize;
  $variant: IconButtonVariant;
  $shape: IconButtonShape;
  $tone: IconButtonTone;
}

// eslint-disable-next-line no-restricted-syntax -- native <button> required for accessibility (focus, keyboard, form-association)
const Root = styled("button", {
  shouldForwardProp: (p) => p !== "$size" && p !== "$variant" && p !== "$shape" && p !== "$tone",
})<RootProps>(({ theme, $size, $variant, $shape, $tone }) => {
  const hit = ICON_BUTTON_HITBOX[$size];
  const baseColor =
    $tone === IconButtonTone.PRIMARY
      ? theme.palette.primary.main
      : $tone === IconButtonTone.DANGER
        ? theme.palette.error.main
        : theme.palette.text.information;
  const hoverColor =
    $tone === IconButtonTone.PRIMARY
      ? theme.palette.primary.dark
      : $tone === IconButtonTone.DANGER
        ? theme.palette.error.dark
        : theme.palette.text.primary;

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: hit,
    height: hit,
    padding: 0,
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
    borderRadius: $shape === IconButtonShape.CIRCLE ? "50%" : ICON_BUTTON_SQUARE_RADII[$size],
    border: $variant === IconButtonVariant.OUTLINE ? `1px solid ${theme.palette.divider}` : 0,
    backgroundColor:
      $variant === IconButtonVariant.OUTLINE ? theme.palette.surface.interface.base : "transparent",
    color: baseColor,
    transition: "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
    "&:hover:not(:disabled)": {
      color: hoverColor,
      backgroundColor:
        $variant === IconButtonVariant.GHOST
          ? "transparent"
          : theme.palette.surface.interface.active,
      borderColor: $variant === IconButtonVariant.OUTLINE ? theme.palette.border.hover : undefined,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    'html[data-reduced-motion="true"] &': {
      transition: "none",
    },
  };
});

export interface GeneralIconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "ref" | "children" | "title"
> {
  /** The icon to render inside the hitbox. Pass the Lucide (or any other) icon
   *  element pre-sized via the `iconSize` lookup `ICON_BUTTON_ICON_SIZES[size]`. */
  icon: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  shape?: IconButtonShape;
  tone?: IconButtonTone;
  /** Required accessibility label — icon-only buttons must announce their purpose. */
  "aria-label": string;
  /** Tooltip text shown on hover/focus. Defaults to `aria-label` since
   *  icon-only buttons must always announce their purpose visually too.
   *  Pass `false` to opt out (e.g. when the button already sits inside a
   *  larger labelled context where a tooltip would be redundant noise). */
  tooltip?: string | false;
  /** Tooltip placement, forwarded to GeneralTooltip. */
  tooltipPlacement?: "top" | "bottom" | "left" | "right";
}

/**
 * Single canonical primitive for icon-only buttons. Every pure-icon button
 * across the app — search clear, dialog close, tooltip trigger, row actions,
 * sidebar collapse — composes this. Custom inline `styled("button")` icon
 * buttons are forbidden; extend `IconButtonSize`/`IconButtonVariant` if a new
 * shape is needed.
 *
 * Tooltip is auto-rendered using `aria-label` by default, since icon-only
 * affordances should always announce their purpose on hover too. Pass
 * `tooltip={false}` to suppress, or a string to override the displayed text.
 */
const GeneralIconButton = forwardRef<HTMLButtonElement, GeneralIconButtonProps>(
  function GeneralIconButton(
    {
      icon,
      size = IconButtonSize.MD,
      variant = IconButtonVariant.SUBTLE,
      shape = IconButtonShape.SQUARE,
      tone = IconButtonTone.NEUTRAL,
      type = "button",
      tooltip,
      tooltipPlacement = "top",
      ...rest
    },
    ref,
  ) {
    const button = (
      <Root
        ref={ref}
        type={type}
        $size={size}
        $variant={variant}
        $shape={shape}
        $tone={tone}
        {...rest}
      >
        {icon}
      </Root>
    );

    if (tooltip === false) return button;
    const tooltipText = tooltip ?? rest["aria-label"];
    if (!tooltipText) return button;
    return (
      <GeneralTooltip title={tooltipText} placement={tooltipPlacement}>
        {button}
      </GeneralTooltip>
    );
  },
);

export default GeneralIconButton;
