import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { TauriCommand, routeToRepo } from "@recrest/shared";

import {
  Copy,
  ExternalLink,
  Folder,
  Maximize2,
  Pin,
  PinOff,
  Terminal as TerminalLucide,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import IdeIcon from "@/assets/icons/IdeIcon";
import ContextMenu from "@/components/molecules/menus/ContextMenu";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { useDefaultIde } from "@/hooks/useDefaultIde";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal, openFolderInSystem } from "@/lib/tauri";
import { deleteRepo, removeRepo } from "@/store/actions/repos.actions";
import { togglePinnedRepo } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

interface Props {
  repo: EnrichedRepo;
  position: { left: number; top: number } | null;
  onClose: () => void;
}

/** Right-click menu shared by the repo list row and the repo card. Mirrors
 *  the action surface in `<RepoActions>` (toolbar overflow) but adds an
 *  "Open detail page" entry at the top — the canonical primary action when
 *  the user wants to dive into a single repo. */
export default function RepoContextMenu({ repo, position, onClose }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const defaultIde = useDefaultIde();
  const [confirmKind, setConfirmKind] = useState<"forget" | "delete" | null>(null);

  const ideLabel = defaultIde.name
    ? t("actions.open_in_named_ide", { ide: defaultIde.name })
    : t("actions.open_in_ide");

  const openDetail = () => navigate(routeToRepo(repo.id));

  const openIde = async () => {
    if (!isTauri()) return;
    try {
      await invoke(TauriCommand.OPEN_IN_IDE, { repoId: repo.id });
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? `${ideLabel} failed`);
    }
  };

  const openTerminal = async () => {
    if (!isTauri()) return;
    try {
      await invoke(TauriCommand.OPEN_TERMINAL, { repoId: repo.id });
    } catch {
      toast.error(t("context_menu.terminal_failed"));
    }
  };

  const openRemote = () => {
    if (repo.remoteUrl) void openExternal(repo.remoteUrl);
    else toast.error(t("context_menu.no_remote"));
  };

  const onCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(repo.path);
      toast.success(t("context_menu.copy_path_done"));
    } catch {
      toast.error(t("context_menu.copy_failed"));
    }
  };

  const onTogglePin = () => dispatch(togglePinnedRepo(repo.id));

  const onConfirmForget = async () => {
    setConfirmKind(null);
    try {
      await dispatch(removeRepo(repo.id)).unwrap();
      toast.success(t("context_menu.forget_done", { name: repo.name }));
    } catch {
      toast.error(t("context_menu.forget_failed"));
    }
  };

  const onConfirmDelete = async () => {
    setConfirmKind(null);
    try {
      await dispatch(deleteRepo(repo.id)).unwrap();
      toast.success(t("context_menu.delete_disk_done", { name: repo.name }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("context_menu.delete_disk_failed", { message: msg }));
    }
  };

  return (
    <>
      <ContextMenu
        position={position}
        onClose={onClose}
        data-testid={TEST_IDS.repos.contextMenu}
        sections={[
          {
            items: [
              {
                key: "open-detail",
                label: t("actions.open_detail_page"),
                icon: <Maximize2 size={13} />,
                variant: "primary",
                onSelect: openDetail,
              },
            ],
          },
          {
            items: [
              {
                key: "open-ide",
                label: ideLabel,
                icon: <IdeIcon id={defaultIde.iconId} size={13} />,
                onSelect: () => void openIde(),
              },
              {
                key: "open-terminal",
                label: t("context_menu.open_in_terminal"),
                icon: <TerminalLucide size={13} />,
                onSelect: () => void openTerminal(),
              },
              {
                key: "open-host",
                label: t("context_menu.open_on_host"),
                icon: <ExternalLink size={13} />,
                disabled: !repo.remoteUrl,
                onSelect: openRemote,
              },
              {
                key: "open-explorer",
                label: t("context_menu.open_in_explorer"),
                icon: <Folder size={13} />,
                onSelect: () => void openFolderInSystem(repo.path),
              },
            ],
          },
          {
            items: [
              {
                key: "pin",
                label: repo.pinned ? t("context_menu.unpin") : t("context_menu.pin"),
                icon: repo.pinned ? <PinOff size={13} /> : <Pin size={13} />,
                onSelect: onTogglePin,
              },
              {
                key: "copy-path",
                label: t("context_menu.copy_path"),
                icon: <Copy size={13} />,
                onSelect: () => void onCopyPath(),
              },
            ],
          },
          {
            items: [
              {
                key: "forget",
                label: t("context_menu.forget"),
                icon: <X size={13} />,
                variant: "danger",
                onSelect: () => setConfirmKind("forget"),
              },
              {
                key: "delete",
                label: t("context_menu.delete_disk"),
                icon: <Trash2 size={13} />,
                variant: "danger",
                onSelect: () => setConfirmKind("delete"),
              },
            ],
          },
        ]}
      />

      <ConfirmationModal
        open={confirmKind === "forget"}
        title={t("context_menu.confirm_forget_title", { name: repo.name })}
        description={t("context_menu.confirm_forget_desc")}
        confirmLabel={t("context_menu.forget")}
        destructive
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmForget()}
      />
      <ConfirmationModal
        open={confirmKind === "delete"}
        title={t("context_menu.confirm_delete_title", { name: repo.name })}
        description={t("context_menu.confirm_delete_desc", { path: repo.path })}
        confirmLabel={t("context_menu.confirm_delete_action")}
        destructive
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  );
}
