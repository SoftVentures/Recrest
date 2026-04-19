import { useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import {
  DEFAULT_SELECTED_ID,
  type DemoRepo,
  LANGUAGE_COLORS,
  demoGroups,
  flatDemoRepos,
  repoAvatarColor,
} from "../data/demoWorkspace";
import { useParallax } from "../hooks/useParallax";
import {
  ActivityIcon,
  BrandMark,
  ChevronDownIcon,
  CodeIcon,
  ExternalLinkIcon,
  GithubIcon,
  GridIcon,
  TerminalIcon,
} from "./icons";

/* ─── Icons not in the shared set ────────────────────── */
const IconChevronUp = () => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const IconSearch = () => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx={11} cy={11} r={7} />
    <line x1={16.65} y1={16.65} x2={21} y2={21} />
  </svg>
);
const IconRefresh = () => (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconBranch = () => (
  <svg
    width={11}
    height={11}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3v12" />
    <circle cx={6} cy={18} r={3} />
    <circle cx={6} cy={6} r={3} />
    <circle cx={18} cy={6} r={3} />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);
const IconMore = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx={5} cy={12} r={1.6} />
    <circle cx={12} cy={12} r={1.6} />
    <circle cx={19} cy={12} r={1.6} />
  </svg>
);
const IconFolder = () => (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
const IconSettings = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconChangesDot = ({ color }: { color: string }) => (
  <span
    style={{
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: color,
    }}
  />
);

/* ─── Window controls (Windows 11 style) ─────────────── */
function WindowsControls() {
  return (
    <div className="demo-winctrls" aria-hidden>
      <span className="demo-winctrl">
        <svg width={10} height={10} viewBox="0 0 10 10">
          <line x1={0} y1={5.5} x2={10} y2={5.5} stroke="currentColor" strokeWidth={1} />
        </svg>
      </span>
      <span className="demo-winctrl">
        <svg width={10} height={10} viewBox="0 0 10 10">
          <rect x={0.5} y={0.5} width={9} height={9} fill="none" stroke="currentColor" />
        </svg>
      </span>
      <span className="demo-winctrl demo-winctrl-close">
        <svg width={10} height={10} viewBox="0 0 10 10">
          <line x1={0} y1={0} x2={10} y2={10} stroke="currentColor" strokeWidth={1} />
          <line x1={10} y1={0} x2={0} y2={10} stroke="currentColor" strokeWidth={1} />
        </svg>
      </span>
    </div>
  );
}

/* ─── Sparkline (bar chart, app-style) ───────────────── */
function Sparkline({ data, dirty }: { data: number[]; dirty: boolean }) {
  const width = 110;
  const height = 24;
  const max = Math.max(...data, 1);
  const barW = Math.max(3, Math.floor((width - (data.length - 1) * 2) / data.length));

  return (
    <div className={`demo-spark${dirty ? " dirty" : ""}`} style={{ width, height }} aria-hidden>
      {data.map((v, i) => {
        const h = v === 0 ? 3 : Math.max(3, (v / max) * height);
        return (
          <span
            key={i}
            className={v === 0 ? "zero" : ""}
            style={{ width: barW, height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}

/* ─── Repo tile (gradient letter avatar — hash-based palette) ─── */
function RepoAvatar({ repo, size = 32 }: { repo: DemoRepo; size?: number }) {
  const letter =
    repo.name
      .replace(/[^A-Za-z0-9]/g, "")
      .charAt(0)
      .toUpperCase() || "?";
  const color = repoAvatarColor(repo.id);
  return (
    <div
      className="demo-repo-avatar"
      style={
        {
          width: size,
          height: size,
          fontSize: Math.round(size * 0.46),
          "--avatar-color": color,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <span className="demo-repo-avatar-letter">{letter}</span>
    </div>
  );
}

/* ─── Row ────────────────────────────────────────────── */
function Row({
  repo,
  active,
  onSelect,
}: {
  repo: DemoRepo;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`demo-trow${active ? " active" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="demo-c-name">
        <RepoAvatar repo={repo} />
        <div className="demo-name-stack">
          <div className="demo-name-line">
            <span className="demo-repo-name">{repo.name}</span>
            {repo.dirty && <span className="demo-dirty-tag">DIRTY</span>}
          </div>
          <div className="demo-repo-path" title={repo.path}>
            {repo.path}
          </div>
        </div>
      </div>

      <div className="demo-c-branch">
        <span className="demo-branch-chip">
          <IconBranch />
          <span>{repo.branch}</span>
        </span>
      </div>

      <div className="demo-c-status">
        {repo.dirty ? (
          <>
            <span className="demo-diff">
              <span className="demo-diff-add">+{repo.added}</span>
              <span className="demo-diff-rem">−{repo.removed}</span>
            </span>
            <span className="demo-status-sub">
              {repo.changed} {repo.changed === 1 ? "file" : "files"}
            </span>
          </>
        ) : (
          <span className="demo-status-clean">clean</span>
        )}
      </div>

      <div className="demo-c-activity">
        <Sparkline data={repo.activity} dirty={repo.dirty} />
      </div>

      <div className="demo-c-actions" aria-hidden>
        <span className="demo-act">
          <CodeIcon />
        </span>
        <span className="demo-act">
          <TerminalIcon />
        </span>
        <span className="demo-act">
          <GithubIcon width={13} height={13} />
        </span>
        <span className="demo-act">
          <IconMore />
        </span>
      </div>
    </div>
  );
}

/* ─── Side item ──────────────────────────────────────── */
function SideItem({
  icon,
  label,
  count,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <div className={`demo-sideitem${active ? " active" : ""}`}>
      <span className="demo-sideitem-ico">{icon}</span>
      <span className="demo-sideitem-label">{label}</span>
      {count != null && <span className="demo-sideitem-count">{count}</span>}
    </div>
  );
}

/* ─── Detail pane — mirrors changes-light.png / repos-light.png ── */
function DetailPane({ repo }: { repo: DemoRepo }) {
  const uncommittedFiles = [
    ".editorconfig",
    ".gitattributes",
    ".github/CODEOWNERS",
    ".github/dependabot.yml",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
  ];

  const recentCommits = [
    {
      author: "Angelina N.",
      sha: "5b332b2",
      msg: "feat(providers): abstract remote trait + github adapter",
      when: "2 h ago",
      color: "#d97757",
      initials: "AN",
    },
    {
      author: "Lukas B.",
      sha: "5caaa7b",
      msg: "design(tokens): refresh accent ramp + dark mode",
      when: "17 h ago",
      color: "#7c3aed",
      initials: "LB",
    },
    {
      author: "Mira W.",
      sha: "62070fa",
      msg: "chore: scaffold src-tauri + wire plugins",
      when: "2 d ago",
      color: "#2f66e6",
      initials: "MW",
    },
  ];

  return (
    <aside className="demo-detail" aria-label="Repository details">
      <div className="demo-detail-head">
        <RepoAvatar repo={repo} size={40} />
        <div className="demo-detail-title">
          <div className="demo-detail-name">
            <span>{repo.name}</span>
            {repo.dirty && <span className="demo-dirty-tag">DIRTY</span>}
          </div>
          <div className="demo-detail-path">{repo.path}</div>
          <div className="demo-detail-lang">
            <span
              className="demo-lang-dot"
              style={{ background: LANGUAGE_COLORS[repo.language] }}
            />
            <span>{repo.language === "typescript" ? "TSX" : repo.language}</span>
          </div>
        </div>
        <span className="demo-detail-close" aria-hidden>
          ×
        </span>
      </div>

      <span className="demo-detail-primary" aria-hidden>
        <CodeIcon />
        Open in IDE
      </span>

      <div className="demo-detail-quick">
        <button type="button" tabIndex={-1} aria-label="Terminal">
          <TerminalIcon />
        </button>
        <button type="button" tabIndex={-1} aria-label="Folder">
          <IconFolder />
        </button>
        <button type="button" tabIndex={-1} aria-label="Remote">
          <GithubIcon width={13} height={13} />
        </button>
        <button type="button" tabIndex={-1} aria-label="External">
          <ExternalLinkIcon />
        </button>
      </div>

      <div className="demo-detail-branch">
        <div className="demo-detail-branch-row">
          <span className="demo-branch-chip">
            <IconBranch />
            <span>{repo.branch}</span>
          </span>
          <div className="demo-detail-ab">
            <span style={{ color: "var(--ink-3)" }}>↑{repo.ahead}</span>
            <span style={{ color: "var(--ink-3)" }}>↓{repo.behind}</span>
          </div>
        </div>
        <div className="demo-detail-branch-acts">
          <button type="button" tabIndex={-1}>
            + Pull
          </button>
          <button type="button" tabIndex={-1}>
            + Fetch
          </button>
          <button type="button" tabIndex={-1}>
            + Branch
          </button>
        </div>
      </div>

      {repo.dirty && (
        <div className="demo-detail-section">
          <div className="demo-detail-sec-head">
            <span className="demo-detail-sec-title">UNCOMMITTED</span>
            <span className="demo-detail-sec-meta">
              <span className="demo-diff-add">+{repo.added}</span>{" "}
              <span className="demo-diff-rem">−{repo.removed}</span> · {repo.changed} files
            </span>
          </div>
          <ul className="demo-detail-files">
            {uncommittedFiles.slice(0, Math.min(8, repo.changed || 8)).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="demo-detail-section">
        <div className="demo-detail-sec-head">
          <span className="demo-detail-sec-title">RECENT COMMITS</span>
          <span className="demo-detail-sec-meta">Log →</span>
        </div>
        <ul className="demo-commits">
          {recentCommits.map((c) => (
            <li key={c.sha}>
              <span
                className="demo-commit-avatar"
                style={{ "--avatar-color": c.color } as React.CSSProperties}
                aria-hidden
              >
                {c.initials}
              </span>
              <div>
                <div className="demo-commit-msg">{c.msg}</div>
                <div className="demo-commit-sub">
                  <span className="demo-commit-sha">{c.sha}</span>
                  <span>{c.when}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/* ─── Main component ─────────────────────────────────── */
export function HeroDemo() {
  // Keep the i18n hook so future extraction is straightforward.
  useTranslation();

  const frameRef = useRef<HTMLDivElement>(null);
  useParallax(frameRef);

  // User-driven selection only — no auto-rotation.
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_SELECTED_ID);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const selected = flatDemoRepos.find((r) => r.id === selectedId) ?? flatDemoRepos[0]!;
  const totalRepos = flatDemoRepos.length;
  const dirtyCount = flatDemoRepos.filter((r) => r.dirty).length;

  return (
    <div className="hero-screenshot">
      <div className="screenshot-frame demo-frame" ref={frameRef}>
        {/* ─── Titlebar ───────────────────────────────────── */}
        <div className="demo-titlebar">
          <div className="demo-titlebar-left">
            <div className="demo-titlebar-icon">
              <BrandMark />
            </div>
            <span>Recrest</span>
            <span className="demo-titlebar-version">v0.1.0</span>
          </div>
          <WindowsControls />
        </div>

        {/* ─── Body: sidebar + main ───────────────────────── */}
        <div className="demo-body">
          {/* ── Sidebar ─────────────────────────────────── */}
          <aside className="demo-sidebar">
            <div className="demo-sidebar-brand">
              <span>Recrest</span>
              <IconChevronUp />
            </div>

            <nav className="demo-sidenav">
              <SideItem
                icon={
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x={3} y={3} width={7} height={9} rx={1} />
                    <rect x={14} y={3} width={7} height={5} rx={1} />
                    <rect x={14} y={12} width={7} height={9} rx={1} />
                    <rect x={3} y={16} width={7} height={5} rx={1} />
                  </svg>
                }
                label="Dashboard"
              />
              <SideItem
                icon={<GridIcon width={14} height={14} />}
                label="Repositories"
                count={totalRepos}
                active
              />
              <SideItem
                icon={<IconChangesDot color="var(--amber)" />}
                label="Changes"
                count={dirtyCount}
              />
              <SideItem icon={<IconBranch />} label="Branches" />
              <SideItem icon={<ActivityIcon width={14} height={14} />} label="Activity" />
            </nav>

            <div className="demo-sidebar-bottom">
              <SideItem icon={<IconSettings />} label="Settings" />
            </div>
          </aside>

          {/* ── Main ────────────────────────────────────── */}
          <div className="demo-main">
            <div className="demo-main-header">
              <div className="demo-main-title">
                <h2 className="demo-main-h2">Repositories</h2>
                <span className="demo-main-meta">
                  {totalRepos} of {totalRepos}
                </span>
              </div>
              <div className="demo-main-tools">
                <div className="demo-search">
                  <IconSearch />
                  <span>Search repositories, branches, MRs&hellip;</span>
                  <span className="demo-kbd">Ctrl+K</span>
                </div>
                <span className="demo-icon-btn" aria-hidden>
                  <IconRefresh />
                </span>
                <span className="btn btn-primary btn-sm" aria-hidden>
                  + Add repo
                </span>
              </div>
            </div>

            <div className="demo-main-body">
              <div className="demo-thead">
                <div className="demo-th">REPOSITORY</div>
                <div className="demo-th">BRANCH</div>
                <div className="demo-th">STATUS</div>
                <div className="demo-th">ACTIVITY · 14D</div>
                <div className="demo-th demo-th-end">ACTIONS</div>
              </div>

              <div className="demo-table">
                {demoGroups.map((group) => {
                  const isClosed = collapsed[group.id];
                  return (
                    <div className="demo-tgroup" key={group.id}>
                      <button
                        type="button"
                        className="demo-group-row"
                        onClick={() => setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))}
                      >
                        <ChevronDownIcon
                          style={{
                            transform: isClosed ? "rotate(-90deg)" : "none",
                            transition: "transform .15s ease",
                          }}
                        />
                        <span className="demo-group-label">{group.label.toUpperCase()}</span>
                        <span className="demo-group-count">{group.repos.length}</span>
                      </button>

                      {!isClosed &&
                        group.repos.map((repo) => (
                          <Row
                            key={repo.id}
                            repo={repo}
                            active={repo.id === selectedId}
                            onSelect={() => setSelectedId(repo.id)}
                          />
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Detail pane (right) ─────────────────────── */}
          <DetailPane repo={selected} />
        </div>
      </div>
    </div>
  );
}
