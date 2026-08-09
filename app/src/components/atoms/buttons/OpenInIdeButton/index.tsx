import { useTranslation } from "react-i18next";

import { TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import IdeIcon from "@/assets/icons/IdeIcon";
import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import { useDefaultIde } from "@/hooks/useDefaultIde";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import type { IdeId } from "@/lib/constants/ides.constants";
import { invoke, isTauri } from "@/lib/tauri";

export const OpenInIdeVariant = {
  /** Compact icon-only chip — used in repo rows / cards. */
  ICON: "icon",
  /** Labelled button — used as primary CTA in detail headers. */
  BUTTON: "button",
} as const;

export type OpenInIdeVariant = (typeof OpenInIdeVariant)[keyof typeof OpenInIdeVariant];

export interface OpenInIdeButtonProps {
  repoId: string;
  variant?: OpenInIdeVariant;
  /** IDE slug used by `IdeIcon`. Defaults to the user's chosen default IDE from
   *  settings (via {@link useDefaultIde}); passing this explicitly overrides it. */
  ideId?: IdeId;
  /** Label shown in tooltip (icon variant) or as button text (button variant).
   *  Defaults to "Open in {selected IDE}", or a generic "Open in IDE" on auto. */
  label?: string;
  iconSize?: IconButtonSize;
  /** Blocks the action — e.g. when the repo folder no longer exists on disk. */
  disabled?: boolean;
  /** Tooltip override. Defaults to the resolved "Open in <IDE>" label; pass the
   *  reason string when `disabled` is set. */
  tooltip?: string;
  className?: string;
  "data-testid"?: string;
}

function OpenInIdeButton({
  repoId,
  variant = OpenInIdeVariant.ICON,
  ideId,
  label,
  iconSize = IconButtonSize.MD,
  disabled,
  tooltip,
  className,
  "data-testid": testId,
}: OpenInIdeButtonProps) {
  const { t } = useTranslation();
  const defaultIde = useDefaultIde();
  const effectiveIdeId = ideId ?? defaultIde.iconId;
  const resolvedLabel =
    label ??
    (defaultIde.name
      ? t("actions.open_in_named_ide", { ide: defaultIde.name })
      : t("actions.open_in_ide"));

  const onClick = async () => {
    if (!isTauri()) return;
    try {
      await invoke(TauriCommand.OPEN_IN_IDE, { repoId });
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? `${resolvedLabel} failed`);
    }
  };

  if (variant === OpenInIdeVariant.BUTTON) {
    return (
      <GeneralButton
        variant="default"
        disabled={disabled}
        onClick={() => void onClick()}
        className={className}
        data-testid={testId}
        startIcon={<IdeIcon id={effectiveIdeId} size={14} />}
      >
        {resolvedLabel}
      </GeneralButton>
    );
  }

  return (
    <GeneralIconButton
      size={iconSize}
      aria-label={t("repo.open_in_ide", { ns: I18nNamespace.ARIA, defaultValue: resolvedLabel })}
      tooltip={tooltip ?? resolvedLabel}
      disabled={disabled}
      onClick={() => void onClick()}
      icon={<IdeIcon id={effectiveIdeId} size={16} color="brand" />}
      className={className}
      data-testid={testId}
    />
  );
}

export default OpenInIdeButton;
