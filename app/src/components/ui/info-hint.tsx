import { type ReactNode } from "react";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoHintProps {
  /** Tooltip body. Plain string or rich node — keep it short. */
  children: ReactNode;
  /** Accessible label for the trigger (default: "More info"). */
  label?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Small `ⓘ` icon that reveals an explanatory tooltip on hover/focus.
 * Use sparingly for fields whose intent isn't obvious from the label alone.
 */
export function InfoHint({
  children,
  label = "More info",
  className,
  side = "top",
}: InfoHintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            className,
          )}
          onClick={(e) => e.preventDefault()}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
