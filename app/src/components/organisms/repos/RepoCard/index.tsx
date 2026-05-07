import { AheadBehind } from "@/components/atoms/AheadBehind";
import { Icon } from "@/components/atoms/Icon";
import { StatusDot } from "@/components/atoms/StatusDot";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import type { EnrichedRepo } from "@/lib/repoEnrich";

/** D.1: compact tile used by the Card view of RepoList. Mirrors the row's
 *  primary signals (logo, name, branch, dirty/clean, ahead/behind) but in
 *  a touch-friendly square instead of a wide grid row. The wider Actions
 *  column is intentionally dropped here — pressing the card opens the
 *  detail drawer, where the same actions live in the header. */
interface RepoCardProps {
  repo: EnrichedRepo;
  selected?: boolean;
  onSelect: (id: string) => void;
  /** Stagger index for the entry animation. Same contract as RepoRow. */
  animIndex?: number;
}

export function RepoCard({ repo, selected, onSelect, animIndex }: RepoCardProps) {
  const STAGGER_CAP = 12;
  const idx = animIndex == null ? 0 : Math.min(animIndex, STAGGER_CAP);
  const dirty = repo.status.dirty;
  const branch = repo.status.branch ?? "—";

  return (
    <button
      type="button"
      className={`repo-card${selected ? " is-selected" : ""}`}
      style={{ "--i": idx } as React.CSSProperties}
      data-testid="repo-card"
      data-repo-id={repo.id}
      data-dirty={dirty ? "true" : undefined}
      onClick={() => onSelect(repo.id)}
    >
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
    </button>
  );
}
