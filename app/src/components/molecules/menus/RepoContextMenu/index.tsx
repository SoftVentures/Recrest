import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { PROVIDER_NAMES, TauriCommand, routeToRepo } from "@recrest/shared";

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
import { useOpenHost } from "@/hooks/useOpenHost";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { errorMessage } from "@/lib/utils/error.utils";
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
  const [confirmKind, setConfirmKind] = useState<"forget" | "delete" | "deletePermanent" | null>(
    null,
  );
  // Keep the confirm dialog open with a spinner while the (potentially slow)
  // backend action runs — trashing a large repo folder can take seconds.
  const [pending, setPending] = useState(false);
  const brand = brandFromUrl(repo.remoteUrl);
  const openHost = useOpenHost(repo.remoteUrl);

  const ideLabel = defaultIde.name
    ? t("actions.open_in_named_ide", { ide: defaultIde.name })
    : t("actions.open_in_ide");

  const openDetail = () => navigate(routeToRepo(repo.id));

  const openIde = async () => {
    if (!isTauri()) return;
    try {
      await invoke(TauriCommand.OPEN_IN_IDE, { repoId: repo.id });
    } catch (err) {
      toast.error(t("context_menu.ide_failed", { ide: ideLabel, message: errorMessage(err) }));
    }
  };

  const openTerminal = async () => {
    if (!isTauri()) return;
    try {
      await invoke(TauriCommand.OPEN_TERMINAL, { repoId: repo.id });
    } catch (err) {
      toast.error(t("context_menu.terminal_failed", { message: errorMessage(err) }));
    }
  };

  const openExplorer = async () => {
    if (!isTauri()) return;
    try {
      await invoke(TauriCommand.OPEN_IN_EXPLORER, { repoId: repo.id });
    } catch (err) {
      toast.error(t("context_menu.explorer_failed", { message: errorMessage(err) }));
    }
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
    setPending(true);
    try {
      await dispatch(removeRepo(repo.id)).unwrap();
      toast.success(t("context_menu.forget_done", { name: repo.name }));
    } catch {
      toast.error(t("context_menu.forget_failed"));
    } finally {
      setPending(false);
      setConfirmKind(null);
    }
  };

  const onConfirmDelete = async () => {
    setPending(true);
    try {
      await dispatch(deleteRepo({ repoId: repo.id })).unwrap();
      toast.success(t("context_menu.delete_disk_done", { name: repo.name }));
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
      toast.success(t("context_menu.delete_disk_done_permanent", { name: repo.name }));
    } catch (err) {
      toast.error(t("context_menu.delete_disk_failed", { message: errorMessage(err) }));
    } finally {
      setPending(false);
      setConfirmKind(null);
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
                label: brand
                  ? t("context_menu.open_on_provider", { provider: PROVIDER_NAMES[brand] })
                  : t("context_menu.open_on_host"),
                icon: <ExternalLink size={13} />,
                disabled: !openHost.canOpen,
                onSelect: openHost.open,
              },
              {
                key: "open-explorer",
                label: t("context_menu.open_in_explorer"),
                icon: <Folder size={13} />,
                onSelect: () => void openExplorer(),
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
        confirmLoading={pending}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmForget()}
      />
      <ConfirmationModal
        open={confirmKind === "delete"}
        title={t("context_menu.confirm_delete_title", { name: repo.name })}
        description={t("context_menu.confirm_delete_desc", { path: repo.path })}
        confirmLabel={t("context_menu.confirm_delete_action")}
        destructive
        confirmLoading={pending}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmDelete()}
      />
      <ConfirmationModal
        open={confirmKind === "deletePermanent"}
        title={t("context_menu.confirm_delete_permanent_title")}
        description={t("context_menu.confirm_delete_permanent_desc", { path: repo.path })}
        confirmLabel={t("context_menu.confirm_delete_permanent_action")}
        destructive
        confirmLoading={pending}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmDeletePermanent()}
      />
      {openHost.modal}
    </>
  );
}
