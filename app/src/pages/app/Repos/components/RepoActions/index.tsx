import { type MouseEvent, useState } from "react";

import { useTranslation } from "react-i18next";

import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";

import { TauriCommand, type TauriCommandName } from "@recrest/shared";

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
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal, revealPathInSystem } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
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
  const dispatch = useAppDispatch();
  const brand = brandFromUrl(repo.remoteUrl);
  const px = ICON_BUTTON_ICON_SIZES[iconSize];

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmKind, setConfirmKind] = useState<"forget" | "delete" | null>(null);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const run = async (cmd: TauriCommandName, label: string) => {
    if (!isTauri()) return;
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch {
      toast.error(`${label} failed`);
    }
  };

  const onOpenRemote = () => {
    if (repo.remoteUrl) void openExternal(repo.remoteUrl);
    else toast.error("No remote configured");
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
      toast.success("Path copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const onTogglePin = () => {
    closeMenu();
    dispatch(togglePinnedRepo(repo.id));
  };

  const onConfirmForget = async () => {
    setConfirmKind(null);
    try {
      await dispatch(removeRepo(repo.id)).unwrap();
      toast.success(`${repo.name} removed`);
    } catch {
      toast.error("Forget failed");
    }
  };
  const onConfirmDelete = async () => {
    setConfirmKind(null);
    try {
      await dispatch(deleteRepo(repo.id)).unwrap();
      toast.success(`${repo.name} moved to trash`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Delete failed: ${msg}`);
    }
  };

  return (
    <>
      <OpenInIdeButton repoId={repo.id} iconSize={iconSize} />
      <GeneralTooltip title="Open in Terminal" placement="top">
        <GeneralIconButton
          size={iconSize}
          aria-label={tAria("repo.open_in_terminal")}
          onClick={() => void run(TauriCommand.OPEN_TERMINAL, "Terminal")}
          icon={<TerminalLucide size={px} />}
        />
      </GeneralTooltip>
      <GeneralTooltip
        title={repo.remoteUrl ? "Open on host" : "No remote configured"}
        placement="top"
      >
        <GeneralIconButton
          size={iconSize}
          aria-label={tAria("repo.open_remote")}
          onClick={onOpenRemote}
          disabled={!repo.remoteUrl}
          icon={brand ? <BrandIcon slug={brand} size={px} /> : <ExternalLink size={px} />}
        />
      </GeneralTooltip>
      <GeneralTooltip title="Open in Explorer" placement="top">
        <GeneralIconButton
          size={iconSize}
          aria-label={tAria("repo.open_in_explorer")}
          onClick={() => void revealPathInSystem(repo.path)}
          icon={<Folder size={px} />}
        />
      </GeneralTooltip>
      <GeneralTooltip title="More" placement="top">
        <GeneralIconButton
          size={iconSize}
          aria-label={tAria("repo.more_actions")}
          onClick={openMenu}
          icon={<MoreHorizontal size={px} />}
        />
      </GeneralTooltip>

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
          <ListItemText>{repo.pinned ? "Unpin" : "Pin"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => void onCopyPath()}>
          <ListItemIcon>
            <Copy size={13} />
          </ListItemIcon>
          <ListItemText>Copy path</ListItemText>
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
          <ListItemText>Forget (keeps folder)</ListItemText>
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
          <ListItemText>Delete from disk</ListItemText>
        </DangerMenuItem>
      </Menu>

      <ConfirmationModal
        open={confirmKind === "forget"}
        title={`Forget "${repo.name}"?`}
        description="Recrest stops tracking this repository. The folder stays on disk — you can re-add it any time."
        confirmLabel="Forget"
        destructive
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmForget()}
      />
      <ConfirmationModal
        open={confirmKind === "delete"}
        title={`Delete "${repo.name}" from disk?`}
        description={`Moves "${repo.path}" to your system trash and stops Recrest from tracking it. You can restore from trash.`}
        confirmLabel="Move to Trash"
        destructive
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  );
}

export default RepoActions;
