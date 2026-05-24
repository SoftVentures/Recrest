import { type KeyboardEvent, type MouseEvent, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { TauriCommand, type TauriCommandName } from "@recrest/shared";

import {
  Copy,
  ExternalLink,
  Folder,
  GitBranch,
  MoreHorizontal,
  Pin,
  Terminal as TerminalLucide,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import BrandIcon from "@/assets/icons/BrandIcon";
import IdeIcon from "@/assets/icons/IdeIcon";
import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralSparkline from "@/components/atoms/sparklines/GeneralSparkline";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import {
  Actions,
  ActivityCell,
  AheadBehind,
  BranchCell,
  BranchChip,
  BranchText,
  Diff,
  FilesMeta,
  Name,
  NameCell,
  Path,
  Row,
  StatusCell,
  StatusText,
  TextCol,
} from "@/pages/app/Repos/components/RepoRow/RepoRow.styles";
import { deleteRepo, removeRepo } from "@/store/actions/repos.actions";
import { togglePinnedRepo } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

export interface RepoRowProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onClick?: (repo: EnrichedRepo) => void;
}

export function RepoRow({ repo, selected, onClick }: RepoRowProps) {
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const dirty = !!repo.status.dirty;
  const ahead = repo.status.ahead;
  const behind = repo.status.behind;
  const brand = brandFromUrl(repo.remoteUrl);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmKind, setConfirmKind] = useState<"forget" | "delete" | null>(null);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const runCommand = async (cmd: TauriCommandName, label: string) => {
    if (!isTauri()) return;
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch {
      toast.error(`${label} failed`);
    }
  };

  const onOpenIde = () => void runCommand(TauriCommand.OPEN_IN_IDE, "Open in IDE");
  const onOpenTerminal = () => void runCommand(TauriCommand.OPEN_TERMINAL, "Terminal");
  const onOpenExplorer = () => void runCommand(TauriCommand.OPEN_IN_EXPLORER, "Explorer");
  const onOpenRemote = () => {
    if (repo.remoteUrl) {
      void openExternal(repo.remoteUrl);
    } else {
      toast.error("No remote configured");
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
    <Row
      role="button"
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      data-testid={TEST_IDS.repos.row}
      data-repo-id={repo.id}
      data-dirty={dirty ? "true" : undefined}
      onClick={() => onClick?.(repo)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
          e.preventDefault();
          onClick?.(repo);
        }
      }}
    >
      <NameCell>
        <RepoAvatar repo={repo} size={28} radius={6} />
        <TextCol>
          <Name data-testid={TEST_IDS.repos.rowName}>{repo.name}</Name>
          <Path>{repo.path}</Path>
        </TextCol>
      </NameCell>

      <BranchCell>
        {repo.status.branch && (
          <BranchChip>
            <GitBranch size={11} />
            <BranchText component="span">{repo.status.branch}</BranchText>
          </BranchChip>
        )}
        {(ahead > 0 || behind > 0) && (
          <AheadBehind component="span" variant="caption">
            {ahead > 0 && <Box component="span">↑{ahead}</Box>}
            {behind > 0 && <Box component="span">↓{behind}</Box>}
          </AheadBehind>
        )}
      </BranchCell>

      <StatusCell>
        {dirty ? (
          <>
            <Diff component="span">
              <Box component="span" className="add">
                +{repo.added}
              </Box>
              <Box component="span" className="rem">
                −{repo.removed}
              </Box>
            </Diff>
            <FilesMeta component="span" variant="caption">
              {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
            </FilesMeta>
          </>
        ) : (
          <StatusText component="span" variant="caption">
            clean
          </StatusText>
        )}
      </StatusCell>

      <ActivityCell>
        <GeneralSparkline
          data={repo.activity}
          accentColor={dirty ? theme.palette.primary.main : undefined}
          width={110}
          height={28}
        />
      </ActivityCell>

      <Actions onClick={stop}>
        <GeneralTooltip title="Open in VS Code" placement="top">
          <GeneralIconButton
            size={IconButtonSize.MD}
            aria-label={tAria("repo.open_in_ide")}
            onClick={onOpenIde}
            icon={<IdeIcon id="vscode" size={16} color="brand" />}
          />
        </GeneralTooltip>
        <GeneralTooltip title="Open in Terminal" placement="top">
          <GeneralIconButton
            size={IconButtonSize.MD}
            aria-label={tAria("repo.open_in_terminal")}
            onClick={onOpenTerminal}
            icon={<TerminalLucide size={15} />}
          />
        </GeneralTooltip>
        <GeneralTooltip
          title={repo.remoteUrl ? "Open on host" : "No remote configured"}
          placement="top"
        >
          <GeneralIconButton
            size={IconButtonSize.MD}
            aria-label={tAria("repo.open_remote")}
            onClick={onOpenRemote}
            disabled={!repo.remoteUrl}
            icon={brand ? <BrandIcon slug={brand} size={16} /> : <ExternalLink size={15} />}
          />
        </GeneralTooltip>
        <GeneralTooltip title="Open in Explorer" placement="top">
          <GeneralIconButton
            size={IconButtonSize.MD}
            aria-label={tAria("repo.open_in_explorer")}
            onClick={onOpenExplorer}
            icon={<Folder size={15} />}
          />
        </GeneralTooltip>
        <GeneralTooltip title="More" placement="top">
          <GeneralIconButton
            size={IconButtonSize.MD}
            aria-label={tAria("repo.more_actions")}
            onClick={openMenu}
            icon={<MoreHorizontal size={15} />}
          />
        </GeneralTooltip>
      </Actions>

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
        <MenuItem
          onClick={() => {
            closeMenu();
            setConfirmKind("forget");
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <X size={13} />
          </ListItemIcon>
          <ListItemText>Forget (keeps folder)</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            setConfirmKind("delete");
          }}
          sx={{ color: "error.main" }}
          data-testid={TEST_IDS.repos.rowDelete}
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <Trash2 size={13} />
          </ListItemIcon>
          <ListItemText>Delete from disk…</ListItemText>
        </MenuItem>
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
    </Row>
  );
}
