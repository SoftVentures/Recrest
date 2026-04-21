import { type ReactNode, useState } from "react";

import { TauriCommand } from "@recrest/shared";

import { Icon } from "@/components/atoms/Icon";
import { IdeIcon } from "@/components/atoms/IdeIcon";
import { IconButton } from "@/components/molecules/IconButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { useActiveIde } from "@/hooks/useActiveIde";
import { invoke } from "@/lib/tauri";
import { toast } from "@/lib/toast";

export type OpenInIdeVariant = "primary" | "default" | "icon";

export interface OpenInIdeButtonProps {
  repoId: string;
  /** `"primary"` = large primary button with IDE icon + label (default);
   *  `"default"` = secondary button with icon + label;
   *  `"icon"` = icon only, for dense row layouts. */
  variant?: OpenInIdeVariant;
  /** Extra className forwarded onto the rendered element. */
  className?: string;
  /** Extra node before the label (e.g. a shortcut badge). Only used in the
   *  text variants. */
  before?: ReactNode;
  /** Fires after a successful launch. Useful when callers need to reset
   *  surrounding state (selection, row-close etc.). */
  onOpened?: () => void;
}

/**
 * Central "Open in …" button — renders the official logo of the currently
 * selected IDE, a dynamic label with its name, and handles toast + busy
 * state internally. When no IDE is detected on the system, the button is
 * disabled and carries an explanatory tooltip.
 *
 * All call sites (DetailPane, RepoRow, RepoDetail, full-screen header) share
 * this component so label, icon and error handling stay consistent and
 * settings changes propagate everywhere at once.
 */
export function OpenInIdeButton({
  repoId,
  variant = "primary",
  className,
  before,
  onOpened,
}: OpenInIdeButtonProps) {
  const activeIde = useActiveIde();
  const [busy, setBusy] = useState(false);
  const disabled = busy || activeIde === null;
  const name = activeIde?.name;
  const title = activeIde ? `Open in ${name}` : "Open in IDE";
  const disabledTitle =
    activeIde === null
      ? "No IDE detected — install VS Code, Cursor, or a JetBrains IDE"
      : undefined;

  const handleClick = async () => {
    if (disabled) return;
    setBusy(true);
    const loadingText = name ? `Opening ${name}…` : "Opening IDE…";
    const successText = name ? `Opened in ${name}` : "Opened in IDE";
    const toastId = toast.loading(loadingText);
    try {
      await invoke(TauriCommand.OPEN_IN_IDE, { repoId });
      toast.success(successText, { id: toastId });
      onOpened?.();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Open in IDE failed";
      toast.error(msg, { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const iconNode = busy ? (
    <Icon name="refresh" size={variant === "icon" ? 13 : 14} />
  ) : activeIde ? (
    <IdeIcon id={activeIde.id} size={variant === "icon" ? 14 : 14} />
  ) : (
    <Icon name="code" size={variant === "icon" ? 13 : 14} />
  );

  if (variant === "icon") {
    return (
      <IconButton
        tooltip={disabledTitle ?? title}
        onClick={() => void handleClick()}
        disabled={disabled}
        className={className}
      >
        {iconNode}
      </IconButton>
    );
  }

  const labelText = busy
    ? name
      ? `Opening ${name}…`
      : "Opening IDE…"
    : name
      ? `Open in ${name}`
      : "Open in IDE";

  const buttonClass = ["r-btn", variant === "primary" ? "primary" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  const button = (
    <button
      type="button"
      className={buttonClass}
      onClick={() => void handleClick()}
      disabled={disabled}
      aria-label={disabledTitle ?? labelText}
      data-testid="open-in-ide-button"
    >
      {before}
      {iconNode}
      {labelText}
    </button>
  );

  if (!disabledTitle) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{disabledTitle}</TooltipContent>
    </Tooltip>
  );
}
