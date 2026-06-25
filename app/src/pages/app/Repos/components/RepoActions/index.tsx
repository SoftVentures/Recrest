import { type MouseEvent, useState } from "react";

import { useTranslation } from "react-i18next";

import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";

import { PROVIDER_NAMES, TauriCommand, type TauriCommandName } from "@recrest/shared";

import {
  Copy,
  ExternalLink,
  Folder,
  MoreHorizontal,
  Pin,
  Terminal as TerminalLucide,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import GeneralIconButton, {
  ICON_BUTTON_ICON_SIZES,
  IconButtonSize,
} from "@/components/atoms/buttons/GeneralIconButton";
import OpenInIdeButton from "@/components/atoms/buttons/OpenInIdeButton";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { useOpenHost } from "@/hooks/useOpenHost";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { errorMessage } from "@/lib/utils/error.utils";
import {
  DangerMenuIcon,
  DangerMenuItem,
} from "@/pages/app/Repos/components/RepoRow/RepoRow.styles";
import { deleteRepo, removeRepo } from "@/store/actions/repos.actions";
import { togglePinnedRepo } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

export interface RepoActionsProps {
  repo: EnrichedRepo;
  /** Hitbox size for the action buttons — `MD` in the list row, `SM` in cards. */
  iconSize?: IconButtonSize;
}

/** The shared trailing action cluster for a repo (IDE / terminal / host /
 *  explorer / overflow menu) plus the overflow menu and its confirmation
 *  modals. Used identically by the list row and the card so behaviour and
 *  design stay in sync. */
export function RepoActions({ repo, iconSize = IconButtonSize.MD }: RepoActionsProps) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const { t } = useTranslation(I18nNamespace.REPOS);
  const dispatch = useAppDispatch();
  const brand = brandFromUrl(repo.remoteUrl);
  const openHost = useOpenHost(repo.remoteUrl);
  const px = ICON_BUTTON_ICON_SIZES[iconSize];

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmKind, setConfirmKind] = useState<"forget" | "delete" | "deletePermanent" | null>(
    null,
  );
  // Keep the confirm dialog open with a spinner while the (potentially slow)
  // backend action runs — trashing a large repo folder can take seconds.
  const [pending, setPending] = useState(false);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const run = async (cmd: TauriCommandName, label: string) => {
    if (!isTauri()) return;
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch (err) {
      toast.error(t("row_actions.toast_command_failed", { label, message: errorMessage(err) }));
    }
  };

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const closeMenu = () => setMenuAnchor(null);

  const onCopyPath = async () => {
    closeMenu();
    try {
      await navigator.clipboard.writeText(repo.path);
      toast.success(t("row_actions.toast_path_copied"));
    } catch {
      toast.error(t("row_actions.toast_copy_failed"));
    }
  };

  const onTogglePin = () => {
    closeMenu();
    dispatch(togglePinnedRepo(repo.id));
  };

  const onConfirmForget = async () => {
    setPending(true);
    try {
      await dispatch(removeRepo(repo.id)).unwrap();
      toast.success(t("row_actions.toast_removed", { name: repo.name }));
    } catch {
      toast.error(t("row_actions.toast_forget_failed"));
    } finally {
      setPending(false);
      setConfirmKind(null);
    }
  };
  const onConfirmDelete = async () => {
    setPending(true);
    try {
      await dispatch(deleteRepo({ repoId: repo.id })).unwrap();
      toast.success(t("row_actions.toast_trashed", { name: repo.name }));
      setConfirmKind(null);
    } catch {
      // Trash failed (e.g. the Recycle Bin is disabled for the drive or a file
      // is locked). Offer the irreversible fallback instead of dead-ending; the
      // specific reason surfaces in the toast if the permanent delete also fails.
      setConfirmKind("deletePermanent");
    } finally {
      setPending(false);
    }
  };
  const onConfirmDeletePermanent = async () => {
    setPending(true);
    try {
      await dispatch(deleteRepo({ repoId: repo.id, permanent: true })).unwrap();
      toast.success(t("row_actions.toast_deleted_permanently", { name: repo.name }));
    } catch (err) {
      toast.error(t("row_actions.toast_delete_failed", { message: errorMessage(err) }));
    } finally {
      setPending(false);
      setConfirmKind(null);
    }
  };

  return (
    <>
      <OpenInIdeButton repoId={repo.id} iconSize={iconSize} />
      <GeneralIconButton
        size={iconSize}
        aria-label={tAria("repo.open_in_terminal")}
        tooltip={t("row_actions.open_in_terminal")}
        onClick={() => void run(TauriCommand.OPEN_TERMINAL, t("row_actions.open_in_terminal"))}
        icon={<TerminalLucide size={px} />}
      />
      <GeneralIconButton
        size={iconSize}
        aria-label={tAria("repo.open_remote")}
        tooltip={
          !repo.remoteUrl
            ? t("row_actions.no_remote")
            : brand
              ? t("row_actions.open_on_provider", { provider: PROVIDER_NAMES[brand] })
              : t("row_actions.open_on_host")
        }
        onClick={openHost.open}
        disabled={!openHost.canOpen}
        icon={brand ? <BrandIcon slug={brand} size={px} /> : <ExternalLink size={px} />}
      />
      <GeneralIconButton
        size={iconSize}
        aria-label={tAria("repo.open_in_explorer")}
        tooltip={t("row_actions.open_in_explorer")}
        onClick={() => void run(TauriCommand.OPEN_IN_EXPLORER, t("row_actions.open_in_explorer"))}
        icon={<Folder size={px} />}
      />
      <GeneralIconButton
        size={iconSize}
        aria-label={tAria("repo.more_actions")}
        tooltip={t("row_actions.more")}
        onClick={openMenu}
        icon={<MoreHorizontal size={px} />}
      />

      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        onClick={stop}
      >
        <MenuItem onClick={onTogglePin}>
          <ListItemIcon>
            <Pin size={13} />
          </ListItemIcon>
          <ListItemText>{repo.pinned ? t("row_actions.unpin") : t("row_actions.pin")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => void onCopyPath()}>
          <ListItemIcon>
            <Copy size={13} />
          </ListItemIcon>
          <ListItemText>{t("row_actions.copy_path")}</ListItemText>
        </MenuItem>
        <DangerMenuItem
          onClick={() => {
            closeMenu();
            setConfirmKind("forget");
          }}
        >
          <DangerMenuIcon>
            <X size={13} />
          </DangerMenuIcon>
          <ListItemText>{t("row_actions.forget")}</ListItemText>
        </DangerMenuItem>
        <DangerMenuItem
          onClick={() => {
            closeMenu();
            setConfirmKind("delete");
          }}
          data-testid={TEST_IDS.repos.rowDelete}
        >
          <DangerMenuIcon>
            <Trash2 size={13} />
          </DangerMenuIcon>
          <ListItemText>{t("row_actions.delete_from_disk")}</ListItemText>
        </DangerMenuItem>
      </Menu>

      <ConfirmationModal
        open={confirmKind === "forget"}
        title={t("row_actions.forget_title", { name: repo.name })}
        description={t("row_actions.forget_desc")}
        confirmLabel={t("row_actions.forget_action")}
        destructive
        confirmLoading={pending}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmForget()}
      />
      <ConfirmationModal
        open={confirmKind === "delete"}
        title={t("row_actions.delete_title", { name: repo.name })}
        description={t("row_actions.delete_desc", { path: repo.path })}
        confirmLabel={t("row_actions.delete_action")}
        destructive
        confirmLoading={pending}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmDelete()}
      />
      <ConfirmationModal
        open={confirmKind === "deletePermanent"}
        title={t("row_actions.delete_permanent_title")}
        description={t("row_actions.delete_permanent_desc", { path: repo.path })}
        confirmLabel={t("row_actions.delete_permanent_action")}
        destructive
        confirmLoading={pending}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmDeletePermanent()}
      />
      {openHost.modal}
    </>
  );
}

export default RepoActions;
