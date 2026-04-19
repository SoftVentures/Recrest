import { Icon } from "@/components/icons/Icon";
import { RepoAvatar } from "@/components/repos/RepoAvatar";
import { AheadBehind, DiffStat, Sparkline } from "@/components/repos/primitives";
import { IconButton } from "@/components/ui/IconButton";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, openExternal } from "@/lib/tauri";
import { toast } from "@/lib/toast";

export const COL_TEMPLATE = "minmax(220px, 1.6fr) minmax(130px, 0.8fr) 110px 96px 120px";

interface RepoRowProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onSelect: (id: string) => void;
}

export function RepoRow({ repo, selected, onSelect }: RepoRowProps) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(repo.id);
    }
  };

  const runCommand = async (cmd: string) => {
    try {
      await invoke(cmd, { repoId: repo.id });
    } catch {
      toast.error("Command failed");
    }
  };

  const openRemote = () => {
    if (repo.remoteUrl) {
      void openExternal(repo.remoteUrl);
    } else {
      toast.error("No remote configured");
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`a-row d-comfy${selected ? " selected" : ""}`}
      style={{ gridTemplateColumns: COL_TEMPLATE }}
      onClick={() => onSelect(repo.id)}
      onKeyDown={handleKey}
    >
      <div className="a-c-name">
        <RepoAvatar repo={repo} size={28} radius={6} />
        <div className="a-name-stack">
          <div className="a-name-line">
            <span className="a-name">{repo.name}</span>
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
            <span className="a-status-sub">
              {repo.filesChanged} file{repo.filesChanged === 1 ? "" : "s"}
            </span>
          </>
        ) : repo.stale ? (
          <span style={{ color: "var(--ink-3)", fontSize: 11 }}>stale</span>
        ) : (
          <span style={{ color: "var(--ink-4)", fontSize: 11 }}>clean</span>
        )}
      </div>

      <div className="a-c-activity">
        <Sparkline data={repo.activity} active={repo.status.dirty} width={88} height={16} />
      </div>

      <div className="a-c-actions" onClick={(e) => e.stopPropagation()}>
        <IconButton tooltip="Open in IDE" onClick={() => void runCommand("open_in_ide")}>
          <Icon name="code" size={13} />
        </IconButton>
        <IconButton tooltip="Open in terminal" onClick={() => void runCommand("open_terminal")}>
          <Icon name="terminal" size={13} />
        </IconButton>
        <IconButton
          tooltip={repo.remoteUrl ? "Open on GitHub" : "No remote configured"}
          onClick={openRemote}
          disabled={!repo.remoteUrl}
        >
          <Icon name="github" size={13} />
        </IconButton>
        <IconButton tooltip="Open in Explorer" onClick={() => void runCommand("open_in_explorer")}>
          <Icon name="folder" size={13} />
        </IconButton>
      </div>
    </div>
  );
}
