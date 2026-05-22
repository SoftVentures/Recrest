import { type KeyboardEvent, type MouseEvent, useState } from "react";

import { Box, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { styled } from "@mui/material/styles";

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

import GeneralSparkline from "@/components/atoms/data/GeneralSparkline";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import GeneralBrandIcon from "@/components/atoms/icons/BrandIcon";
import GeneralIdeIcon from "@/components/atoms/icons/IdeIcon";
import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import ConfirmDialog from "@/components/molecules/dialogs/ConfirmDialog";
import {
  PAGE_EASE,
  pgSlideL,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri, openExternal } from "@/lib/tauri";
import { brandFromUrl } from "@/lib/utils/brandFromUrl";
import { deleteRepo, removeRepo } from "@/store/actions/repos.actions";
import { togglePinnedRepo } from "@/store/actions/ui.actions";
import { useAppDispatch } from "@/store/hooks";

export interface RepoRowProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onClick?: (repo: EnrichedRepo) => void;
}

export function RepoRow({ repo, selected, onClick }: RepoRowProps) {
  const dispatch = useAppDispatch();
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
      data-testid="repo-row"
      data-repo-id={repo.id}
      data-dirty={dirty ? "true" : undefined}
      onClick={() => onClick?.(repo)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(repo);
        }
      }}
    >
      <NameCell>
        <GeneralRepoAvatar repo={repo} size={28} radius={6} />
        <TextCol>
          <Name data-testid="repo-row-name">{repo.name}</Name>
          <Path>{repo.path}</Path>
        </TextCol>
      </NameCell>

      <BranchCell>
        {repo.status.branch && (
          <BranchChip>
            <GitBranch size={11} />
            <BranchText>{repo.status.branch}</BranchText>
          </BranchChip>
        )}
        {(ahead > 0 || behind > 0) && (
          <AheadBehind>
            {ahead > 0 && <span>↑{ahead}</span>}
            {behind > 0 && <span>↓{behind}</span>}
          </AheadBehind>
        )}
      </BranchCell>

      <StatusCell>
        {dirty ? (
          <>
            <Diff>
              <span className="add">+{repo.added}</span>
              <span className="rem">−{repo.removed}</span>
            </Diff>
            <FilesMeta>
              {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
            </FilesMeta>
          </>
        ) : (
          <StatusText>clean</StatusText>
        )}
      </StatusCell>

      <ActivityCell>
        <GeneralSparkline data={repo.activity} active={dirty} width={110} height={28} />
      </ActivityCell>

      <Actions onClick={stop}>
        <GeneralTooltip title="Open in VS Code" placement="top">
          <ActionBtn type="button" aria-label="Open in IDE" onClick={onOpenIde}>
            <GeneralIdeIcon id="vscode" size={16} color="brand" />
          </ActionBtn>
        </GeneralTooltip>
        <GeneralTooltip title="Open in Terminal" placement="top">
          <ActionBtn type="button" aria-label="Open in Terminal" onClick={onOpenTerminal}>
            <TerminalLucide size={15} />
          </ActionBtn>
        </GeneralTooltip>
        <GeneralTooltip
          title={repo.remoteUrl ? "Open on host" : "No remote configured"}
          placement="top"
        >
          <ActionBtn
            type="button"
            aria-label="Open remote"
            onClick={onOpenRemote}
            disabled={!repo.remoteUrl}
          >
            {brand ? <GeneralBrandIcon slug={brand} size={16} /> : <ExternalLink size={15} />}
          </ActionBtn>
        </GeneralTooltip>
        <GeneralTooltip title="Open in Explorer" placement="top">
          <ActionBtn type="button" aria-label="Open in Explorer" onClick={onOpenExplorer}>
            <Folder size={15} />
          </ActionBtn>
        </GeneralTooltip>
        <GeneralTooltip title="More" placement="top">
          <ActionBtn type="button" aria-label="More" onClick={openMenu}>
            <MoreHorizontal size={15} />
          </ActionBtn>
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
          data-testid="repo-row-delete"
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <Trash2 size={13} />
          </ListItemIcon>
          <ListItemText>Delete from disk…</ListItemText>
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmKind === "forget"}
        title={`Forget "${repo.name}"?`}
        description="Recrest stops tracking this repository. The folder stays on disk — you can re-add it any time."
        confirmLabel="Forget"
        destructive
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => void onConfirmForget()}
      />
      <ConfirmDialog
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

const Row = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.6fr) minmax(130px, 0.9fr) 110px 120px minmax(140px, auto)",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  backgroundColor: "transparent",
  transition: "background-color 0.12s ease",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
  "&[data-selected='true']": {
    backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 8%, transparent)`,
  },
  // Mount stagger: rows slide in from the left in quick succession. Tight
  // 20ms step + 200ms duration so 10 rows finish within ~400ms total.
  animation: `${pgSlideL} 200ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 20, count: 12 }),
  ...prefersReducedMotionGuard,
}));

const NameCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
});

const TextCol = styled(Box)({ minWidth: 0 });

const Name = styled("div")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const Path = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const BranchCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
});

const BranchChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "3px 8px",
  backgroundColor: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  fontSize: 11.5,
  color: theme.palette.text.primary,
  maxWidth: 130,
  minWidth: 0,
  fontVariantNumeric: "tabular-nums",
}));

const BranchText = styled("span")({
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
});

const AheadBehind = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
}));

const StatusCell = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
});

const StatusText = styled("span")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
}));

const Diff = styled("span")(({ theme }) => ({
  display: "inline-flex",
  gap: 4,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  "& .add": { color: theme.palette.success.main },
  "& .rem": { color: theme.palette.error.main },
}));

const FilesMeta = styled("span")(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.informationLight,
  marginTop: 2,
}));

const ActivityCell = styled(Box)({
  display: "flex",
  alignItems: "center",
});

const Actions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 4,
});

const ActionBtn = styled("button")(({ theme }) => ({
  width: 26,
  height: 26,
  borderRadius: 8,
  border: `1px solid transparent`,
  backgroundColor: "transparent",
  color: theme.palette.text.information,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  transition: "background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease",
  "&:hover:not(:disabled)": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.divider,
    color: theme.palette.text.primary,
  },
  "&:disabled": {
    opacity: 0.4,
    cursor: "default",
  },
}));
