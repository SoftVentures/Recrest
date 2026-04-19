import { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";

type ButtonProps = ComponentPropsWithoutRef<"button">;

interface IconButtonProps extends ButtonProps {
  tooltip: ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

/** Tooltip text is reused as the accessible name when the caller hasn't
 *  provided an explicit `aria-label`. Only strings can serve as names;
 *  richer ReactNode tooltips still need an explicit `aria-label`. */
function resolveAriaLabel(explicit: string | undefined, tooltip: ReactNode): string | undefined {
  if (explicit) return explicit;
  return typeof tooltip === "string" ? tooltip : undefined;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    tooltip,
    tooltipSide = "bottom",
    className,
    children,
    type = "button",
    "aria-label": ariaLabel,
    ...rest
  },
  ref,
) {
  const resolvedLabel = resolveAriaLabel(ariaLabel, tooltip);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type={type}
          className={className ?? "icon-btn"}
          aria-label={resolvedLabel}
          {...rest}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});

type AnchorProps = ComponentPropsWithoutRef<"a">;

interface IconLinkProps extends AnchorProps {
  tooltip: ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

export const IconLink = forwardRef<HTMLAnchorElement, IconLinkProps>(function IconLink(
  { tooltip, tooltipSide = "bottom", className, children, "aria-label": ariaLabel, ...rest },
  ref,
) {
  const resolvedLabel = resolveAriaLabel(ariaLabel, tooltip);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a ref={ref} className={className ?? "icon-btn"} aria-label={resolvedLabel} {...rest}>
          {children}
        </a>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});
