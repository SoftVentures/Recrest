import { TauriCommand, type TauriCommandName } from "@recrest/shared";

import { AheadBehind } from "@/components/atoms/AheadBehind";
import { BrandIcon, brandFromUrl } from "@/components/atoms/BrandIcon";
import { Icon } from "@/components/atoms/Icon";
import { StatusDot } from "@/components/atoms/StatusDot";
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
import { togglePinnedRepoPersisted } from "@/store/slices/uiSlice";

interface RepoCardProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onSelect: (id: string) => void;
  animIndex?: number;
}

export function RepoCard({ repo, selected, onSelect, animIndex }: RepoCardProps) {
  const dispatch = useAppDispatch();
  const { confirm, node: confirmNode } = useConfirm();
  const STAGGER_CAP = 12;
  const idx = animIndex == null ? 0 : Math.min(animIndex, STAGGER_CAP);
  const dirty = repo.status.dirty;
  const branch = repo.status.branch ?? "—";

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
    if (repo.remoteUrl) void openExternal(repo.remoteUrl);
    else toast.error("No remote configured");
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

  const remoteBrand = brandFromUrl(repo.remoteUrl);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`repo-card${selected ? " is-selected" : ""}`}
      style={{ "--i": idx } as React.CSSProperties}
      data-testid="repo-card"
      data-repo-id={repo.id}
      data-dirty={dirty ? "true" : undefined}
      onClick={() => onSelect(repo.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(repo.id);
        }
      }}
    >
      {confirmNode}
      {/* Always-visible actions strip in the top-right corner, absolutely
       *  positioned so it never affects the card's body layout. Each button
       *  stops propagation so clicking an action does not also trigger the
       *  card's onSelect. */}
      <div
        className="repo-card-actions"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
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
          {remoteBrand ? (
            <BrandIcon slug={remoteBrand} size={13} />
          ) : (
            <Icon name="external" size={13} />
          )}
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
            <DropdownMenuItem onSelect={() => void dispatch(togglePinnedRepoPersisted(repo.id))}>
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

      <div className="repo-card-top">
        <RepoAvatar repo={repo} size={36} radius={8} />
        {repo.pinned && <Icon name="pin" size={11} color="var(--accent)" />}
      </div>
      <div className="repo-card-body">
        <div className="repo-card-name" data-testid="repo-card-name">
          {repo.name}
        </div>
        <div className="repo-card-branch">
          <Icon name="branch" size={11} />
          <span>{branch}</span>
        </div>
      </div>
      <div className="repo-card-footer">
        <StatusDot kind={dirty ? "dirty" : "clean"} />
        <span className="repo-card-status">{dirty ? `${repo.filesChanged} changed` : "clean"}</span>
        {(repo.status.ahead > 0 || repo.status.behind > 0) && (
          <AheadBehind ahead={repo.status.ahead} behind={repo.status.behind} compact />
        )}
      </div>
    </div>
  );
}
