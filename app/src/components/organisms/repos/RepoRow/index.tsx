import { TauriCommand, type TauriCommandName } from "@recrest/shared";

import { AheadBehind } from "@/components/atoms/AheadBehind";
import { BrandIcon, brandFromUrl } from "@/components/atoms/BrandIcon";
import { DiffStat } from "@/components/atoms/DiffStat";
import { Icon } from "@/components/atoms/Icon";
import { Sparkline } from "@/components/atoms/Sparkline";
import { IconButton } from "@/components/molecules/IconButton";
import { OpenInIdeButton } from "@/components/molecules/OpenInIdeButton";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { useConfirm } from "@/components/molecules/compounds/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/compounds/DropdownMenu";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/store/hooks";
import { removeRepo } from "@/store/slices/reposSlice";
import { togglePinnedRepo } from "@/store/slices/uiSlice";

export const COL_TEMPLATE = "minmax(220px, 1.6fr) minmax(130px, 0.8fr) 110px 96px 120px";

interface RepoRowProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onSelect: (id: string) => void;
}

export function RepoRow({ repo, selected, onSelect }: RepoRowProps) {
  const dispatch = useAppDispatch();
  const { confirm, node: confirmNode } = useConfirm();
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(repo.id);
    }
  };

  const runCommand = async (cmd: TauriCommandName, label: string) => {
    const id = toast.loading(`Opening ${label}…`);
    try {
      await invoke(cmd, { repoId: repo.id });
      toast.success(`${label} opened`, { id });
    } catch {
      toast.error(`${label} failed`, { id });
    }
  };

  const openRemote = () => {
    if (repo.remoteUrl) {
      void openExternal(repo.remoteUrl);
    } else {
      toast.error("No remote configured");
    }
  };

  const onCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(repo.path);
      toast.success("Path copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const onForget = async () => {
    const ok = await confirm({
      title: `Forget "${repo.name}"?`,
      description:
        "Recrest will stop tracking this repository. The folder stays on disk — you can re-add it any time.",
      confirmLabel: "Forget",
      tone: "destructive",
      rememberKey: "repo-forget",
    });
    if (!ok) return;
    const id = toast.loading(`Forgetting ${repo.name}…`);
    try {
      await dispatch(removeRepo(repo.id)).unwrap();
      toast.success(`${repo.name} removed`, { id });
    } catch {
      toast.error("Forget failed", { id });
    }
  };

  return (
    <div
      className={`a-row d-comfy${selected ? " selected" : ""}`}
      style={{ gridTemplateColumns: COL_TEMPLATE }}
      data-testid="repo-row"
      data-repo-id={repo.id}
      data-repo-name={repo.name}
      data-selected={selected ? "true" : undefined}
      data-dirty={repo.status.dirty ? "true" : undefined}
    >
      <div
        role="button"
        tabIndex={0}
        className="a-c-name"
        aria-label={`Select repo: ${repo.name}`}
        data-testid="repo-row-select"
        onClick={() => onSelect(repo.id)}
        onKeyDown={handleKey}
      >
        <RepoAvatar repo={repo} size={28} radius={6} />
        <div className="a-name-stack">
          <div className="a-name-line">
            <span className="a-name" data-testid="repo-row-name">
              {repo.name}
            </span>
            {repo.pinned && <Icon name="pin" size={11} color="var(--accent)" />}
          </div>
          <div className="a-path">{repo.path}</div>
        </div>
      </div>

      <div className="a-c-branch">
        <span className="a-branch-chip">
          <Icon name="branch" size={11} />
          <span>{repo.status.branch ?? "—"}</span>
        </span>
        <AheadBehind ahead={repo.status.ahead} behind={repo.status.behind} compact />
      </div>

      <div className="a-c-status">
        {repo.status.dirty ? (
          <>
            <DiffStat added={repo.added} removed={repo.removed} />
            <span className="a-status-sub" data-testid="repo-row-dirty">
              {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span style={{ color: "var(--ink-4)", fontSize: 11 }}>clean</span>
        )}
      </div>

      <div className="a-c-activity">
        <Sparkline data={repo.activity} active={repo.status.dirty} width={88} height={16} />
      </div>

      <div className="a-c-actions" onClick={(e) => e.stopPropagation()}>
        {confirmNode}
        <OpenInIdeButton repoId={repo.id} variant="icon" />
        <IconButton
          tooltip="Open in terminal"
          onClick={() => void runCommand(TauriCommand.OPEN_TERMINAL, "Terminal")}
        >
          <Icon name="terminal" size={13} />
        </IconButton>
        <IconButton
          tooltip={repo.remoteUrl ? "Open on host" : "No remote configured"}
          onClick={openRemote}
          disabled={!repo.remoteUrl}
        >
          {(() => {
            const brand = brandFromUrl(repo.remoteUrl);
            return brand ? (
              <BrandIcon slug={brand} size={13} />
            ) : (
              <Icon name="external" size={13} />
            );
          })()}
        </IconButton>
        <IconButton
          tooltip="Open in Explorer"
          onClick={() => void runCommand(TauriCommand.OPEN_IN_EXPLORER, "Explorer")}
        >
          <Icon name="folder" size={13} />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton tooltip="More">
              <Icon name="more" size={13} />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => dispatch(togglePinnedRepo(repo.id))}>
              <Icon name="pin" size={12} />{" "}
              <span className="ml-2">{repo.pinned ? "Unpin" : "Pin"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void onCopyPath()}>
              <Icon name="folder" size={12} /> <span className="ml-2">Copy path</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void onForget()}
              className="text-destructive focus:text-destructive"
            >
              <Icon name="x" size={12} />{" "}
              <span className="ml-2">Forget (keeps folder on disk)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
