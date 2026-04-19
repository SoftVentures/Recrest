import { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ButtonProps = ComponentPropsWithoutRef<"button">;

interface IconButtonProps extends ButtonProps {
  tooltip: ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { tooltip, tooltipSide = "bottom", className, children, type = "button", ...rest },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button ref={ref} type={type} className={className ?? "icon-btn"} {...rest}>
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
  { tooltip, tooltipSide = "bottom", className, children, ...rest },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a ref={ref} className={className ?? "icon-btn"} {...rest}>
          {children}
        </a>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});
