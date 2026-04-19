import { useTranslation } from "react-i18next";

import { BitbucketIcon, FolderIcon, GithubIcon, GitlabIcon, ServerIcon, TauriIcon } from "./icons";

type Props = { className?: string };

/**
 * Three-lane "data flow" visual for the privacy section.
 *
 * Disk (local repos) → Recrest (Tauri runtime) → Remote (GitHub/GitLab/Bitbucket).
 * A ghosted "No Recrest server" column sits to the right, struck-through, to
 * drive the privacy story visually.
 *
 * Animated dots drift left-to-right along the two live paths. The struck-out
 * lane has no dots and no animation. Reduced-motion disables the drift via
 * a global rule in globals.css.
 */
export function DataFlow({ className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={`data-flow${className ? ` ${className}` : ""}`} aria-hidden>
      <div className="df-lanes">
        <DiskLane label={t("privacy.dataFlow.disk")} />
        <DriftPath label={t("privacy.dataFlow.arrowIn")} />
        <RecrestLane label={t("privacy.dataFlow.recrest")} />
        <DriftPath label={t("privacy.dataFlow.arrowOut")} />
        <RemoteLane label={t("privacy.dataFlow.remote")} />
      </div>

      <div className="df-no-server" role="note">
        <div className="df-no-server-line" />
        <div className="df-no-server-tag">
          <ServerIcon width={14} height={14} />
          <span>{t("privacy.dataFlow.noServer")}</span>
        </div>
      </div>
    </div>
  );
}

function DiskLane({ label }: { label: string }) {
  return (
    <div className="df-lane df-lane-disk">
      <div className="df-lane-head">{label}</div>
      <div className="df-stack">
        <DiskRow name="recrest" branch="main" />
        <DiskRow name="dashboard-api" branch="feat/auth" />
        <DiskRow name="mobile-app" branch="release/2.4" />
        <DiskRow name="portfolio.dev" branch="main" />
      </div>
    </div>
  );
}

function DiskRow({ name, branch }: { name: string; branch: string }) {
  return (
    <div className="df-disk-row">
      <FolderIcon width={12} height={12} />
      <span className="df-disk-name">{name}</span>
      <span className="df-disk-branch">{branch}</span>
    </div>
  );
}

function RecrestLane({ label }: { label: string }) {
  return (
    <div className="df-lane df-lane-recrest">
      <div className="df-lane-head">{label}</div>
      <div className="df-recrest-body">
        <div className="df-recrest-tauri" title="Tauri runtime">
          <TauriIcon width={26} height={26} />
        </div>
        <div className="df-recrest-chips">
          <span className="df-chip">read</span>
          <span className="df-chip">watch</span>
          <span className="df-chip">render</span>
        </div>
      </div>
    </div>
  );
}

function RemoteLane({ label }: { label: string }) {
  return (
    <div className="df-lane df-lane-remote">
      <div className="df-lane-head">{label}</div>
      <div className="df-remotes">
        <div className="df-remote">
          <GithubIcon width={14} height={14} />
          <span>GitHub</span>
        </div>
        <div className="df-remote">
          <GitlabIcon width={14} height={14} />
          <span>GitLab</span>
        </div>
        <div className="df-remote">
          <BitbucketIcon width={14} height={14} />
          <span>Bitbucket</span>
        </div>
      </div>
    </div>
  );
}

function DriftPath({ label }: { label: string }) {
  return (
    <div className="df-path" aria-label={label}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="df-path-svg">
        <line x1={0} y1={20} x2={100} y2={20} className="df-path-line" />
        <polyline points="90,14 100,20 90,26" className="df-path-arrow" />
      </svg>
      <div className="df-dots">
        <span className="df-dot" style={{ animationDelay: "0s" }} />
        <span className="df-dot" style={{ animationDelay: "0.9s" }} />
        <span className="df-dot" style={{ animationDelay: "1.8s" }} />
      </div>
    </div>
  );
}
