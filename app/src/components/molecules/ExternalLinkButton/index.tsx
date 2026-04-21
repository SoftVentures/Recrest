import type { ReactNode } from "react";

import { Icon } from "@/components/atoms/Icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { openExternal } from "@/lib/tauri";

interface ExternalLinkButtonProps {
  url: string;
  label?: ReactNode;
  /** Visual size — matches the `r-btn` / `r-btn sm` scale. */
  size?: "sm" | "md";
  /** When true, renders only the external-link icon (accessible label comes
   *  from `title`). Used in row-level action strips. */
  iconOnly?: boolean;
  title?: string;
  className?: string;
}

/**
 * Small anchor-style button that opens `url` via the Tauri opener plugin
 * (with a `window.open` fallback outside Tauri). Replaces the ~26 inline
 * `<button onClick={() => void openExternal(url)}>` patterns scattered
 * across detail panes, about tabs, provider rows, and PR link buttons.
 */
export function ExternalLinkButton({
  url,
  label,
  size = "md",
  iconOnly,
  title,
  className,
}: ExternalLinkButtonProps) {
  const classes = ["r-btn", size === "sm" ? "sm" : "", className ?? ""].filter(Boolean).join(" ");
  const tooltipText = title ?? (typeof label === "string" ? label : url);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={classes}
          aria-label={tooltipText}
          data-testid="external-link-button"
          onClick={() => void openExternal(url)}
        >
          <Icon name="external" size={size === "sm" ? 11 : 12} />
          {!iconOnly && label}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
