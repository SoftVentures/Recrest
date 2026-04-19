import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Icon } from "@/components/icons/Icon";
import { RepoAvatar } from "@/components/repos/RepoAvatar";
import { CIDot, type CIState, langMeta } from "@/components/repos/primitives";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos, scanForRepos } from "@/store/slices/reposSlice";
import { saveSettings } from "@/store/slices/settingsSlice";
import { bumpRefreshNonce, setSearchOpen, setSelectedRepo } from "@/store/slices/uiSlice";

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const prsItems = useAppSelector((s) => s.prs.items);
  const prs = Object.values(prsItems).flat();

  const dirtyRepos = repos.filter((r) => r.status.dirty);
  const behindRepos = repos.filter((r) => r.status.behind > 0);
  const openPRs = prs.filter((p) => p.state === "open");

  const totalAhead = repos.reduce((s, r) => s + r.status.ahead, 0);
  const totalBehind = repos.reduce((s, r) => s + r.status.behind, 0);

  const agg = useMemo(() => {
    const out = Array<number>(14).fill(0);
    for (const r of repos) r.activity.forEach((v, i) => (out[i] = (out[i] ?? 0) + v));
    return out;
  }, [repos]);
  const totalCommits = agg.reduce((s, v) => s + v, 0);
  const maxDay = Math.max(...agg, 1);

  // Real recent commits across all repos — Rust sorts newest-first, we take the top 6.
  const { commits: recentCommits } = useRecentCommits({ days: 14, limit: 50 });
  const recent = useMemo(() => {
    const byRepo = new Map(repos.map((r) => [r.id, r] as const));
    return recentCommits.slice(0, 6).map((c) => ({ ...c, repo: byRepo.get(c.repoId) }));
  }, [recentCommits, repos]);

  const langs = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of repos) c[r.lang] = (c[r.lang] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [repos]);

  const goto = (repoId: string, path = "/repos") => {
    dispatch(setSelectedRepo(repoId));
    navigate(path);
  };

  const scanPaths = useAppSelector((s) => s.settings.scanPaths);
  const [fetching, setFetching] = useState(false);

  const onFetchAll = async () => {
    if (!isTauri()) return;
    setFetching(true);
    try {
      const ok = await invoke<number>("git_fetch_all");
      toast.success(`Fetched ${ok} repo${ok === 1 ? "" : "s"}`);
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch {
      toast.error("Fetch all failed");
    } finally {
      setFetching(false);
    }
  };

  const onAddScanPath = async () => {
    if (!isTauri()) {
      toast.info("Adding repos needs the desktop app.");
      return;
    }
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({ directory: true, multiple: false, title: "Pick repo folder" });
      if (typeof picked !== "string" || !picked) return;
      if (scanPaths.includes(picked)) return;
      const next = [...scanPaths, picked];
      await dispatch(saveSettings({ scanPaths: next })).unwrap();
      await dispatch(scanForRepos(next)).unwrap();
      dispatch(bumpRefreshNonce());
      toast.success("Scan path added.");
    } catch {
      toast.error("Couldn't add that folder");
    }
  };

  const onFindAcrossRepos = () => {
    // No dedicated cross-repo search yet — route through the existing command
    // palette which already indexes every repo.
    dispatch(setSearchOpen(true));
  };

  return (
    <div className="a-dash">
      <div className="a-dash-kpis">
        <KPI
          label={t("dash.kpi.repositories")}
          value={repos.length}
          sub={t("dash.kpi.repositories_sub", { count: dirtyRepos.length })}
          onClick={() => navigate("/repos")}
        />
        <KPI
          label={t("dash.kpi.merge_requests")}
          value={openPRs.length}
          sub={t("dash.kpi.merge_requests_sub", { count: prs.filter((p) => p.draft).length })}
          tone="accent"
          onClick={() => navigate("/merge-requests")}
        />
        <KPI
          label={t("dash.kpi.ahead_behind")}
          value={
            <>
              ↑{totalAhead} <span className="a-dash-k-sep">/</span> ↓{totalBehind}
            </>
          }
          sub={t("dash.kpi.ahead_behind_sub")}
          onClick={() => navigate("/branches")}
        />
        <KPI
          label={t("dash.kpi.commits")}
          value={totalCommits}
          sub={t("dash.kpi.commits_sub", { count: maxDay })}
        />
      </div>

      <div className="a-dash-grid">
        <section className="a-dash-card a-dash-activity">
          <div className="a-dash-card-h">
            <h3>{t("dash.activity.title")}</h3>
            <span className="a-dash-card-m">
              {t("dash.activity.meta", { total: totalCommits, repos: repos.length })}
            </span>
          </div>
          <div className="a-dash-chart">
            {agg.map((v, i) => (
              <div key={i} className="a-dash-bar-col">
                <div
                  className="a-dash-bar"
                  style={{ height: `${(v / maxDay) * 100}%` }}
                  title={`${v} commits`}
                />
              </div>
            ))}
          </div>
          <div className="a-dash-chart-axis">
            <span>14d ago</span>
            <span>7d</span>
            <span>today</span>
          </div>
        </section>

        <section className="a-dash-card">
          <div className="a-dash-card-h">
            <h3>{t("dash.attention.title")}</h3>
            <span className="a-dash-card-m">{dirtyRepos.length + behindRepos.length} items</span>
          </div>
          <div className="a-dash-attn">
            {dirtyRepos.slice(0, 3).map((r) => (
              <AttentionRow key={r.id} repo={r} kind="dirty" onClick={() => goto(r.id)} />
            ))}
            {behindRepos.slice(0, 2).map((r) => (
              <AttentionRow key={r.id + "-b"} repo={r} kind="behind" onClick={() => goto(r.id)} />
            ))}
            {dirtyRepos.length === 0 && behindRepos.length === 0 && (
              <div className="a-dash-empty">{t("dash.attention.empty")}</div>
            )}
          </div>
        </section>

        <section className="a-dash-card">
          <div className="a-dash-card-h">
            <h3>{t("dash.mrs.title")}</h3>
            <button
              type="button"
              className="a-dash-link"
              onClick={() => navigate("/merge-requests")}
            >
              {t("dash.mrs.all")}
            </button>
          </div>
          <div className="a-dash-mrs">
            {openPRs.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                className="a-dash-mr"
                onClick={() => navigate("/merge-requests")}
              >
                <Icon name="pr" size={14} color={p.draft ? "var(--ink-3)" : "var(--green)"} />
                <div className="a-dash-mr-body">
                  <div className="a-dash-mr-title">{p.title}</div>
                  <div className="a-dash-mr-meta">
                    #{p.number} · {p.author}
                  </div>
                </div>
                <CIDot state={ciToDot(p.ciStatus)} />
              </button>
            ))}
            {openPRs.length === 0 && <div className="a-dash-empty">{t("dash.mrs.empty")}</div>}
          </div>
        </section>

        <section className="a-dash-card">
          <div className="a-dash-card-h">
            <h3>{t("dash.commits.title")}</h3>
            <button type="button" className="a-dash-link" onClick={() => navigate("/activity")}>
              {t("dash.commits.all")}
            </button>
          </div>
          <div className="a-dash-commits">
            {recent.map((c) => (
              <button
                key={c.sha}
                type="button"
                className="a-dash-commit"
                onClick={() => goto(c.repoId)}
              >
                {c.repo && <RepoAvatar repo={c.repo} size={24} radius={5} />}
                <div className="a-dash-commit-body">
                  <div className="a-dash-commit-msg">{c.summary || "—"}</div>
                  <div className="a-dash-commit-meta">
                    <span>{c.repoName}</span>
                    <span className="a-dp-sep">·</span>
                    <span>{c.author}</span>
                    <span className="a-dp-sep">·</span>
                    <span className="a-dash-commit-sha">{c.sha.slice(0, 7)}</span>
                  </div>
                </div>
              </button>
            ))}
            {recent.length === 0 && (
              <div className="a-dash-empty">{t("dash.commits.empty", { defaultValue: "—" })}</div>
            )}
          </div>
        </section>

        <section className="a-dash-card a-dash-langs-card">
          <div className="a-dash-card-h">
            <h3>{t("dash.langs.title")}</h3>
            <span className="a-dash-card-m">{repos.length} repos</span>
          </div>
          <div className="a-dash-langs-bar">
            {langs.map(([l, n]) => (
              <div
                key={l}
                className="a-dash-lang-seg"
                style={{ flex: n, background: langMeta(l).color }}
                title={`${langMeta(l).label}: ${n}`}
              />
            ))}
          </div>
          <div className="a-dash-langs-list">
            {langs.map(([l, n]) => {
              const meta = langMeta(l);
              return (
                <div key={l} className="a-dash-lang-item">
                  <span className="lang-dot" style={{ background: meta.color }} />
                  <span className="a-dash-lang-lbl">{meta.label}</span>
                  <span className="a-dash-lang-n">{n}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="a-dash-card a-dash-quick-card">
          <div className="a-dash-card-h">
            <h3>{t("dash.quick.title")}</h3>
          </div>
          <div className="a-dash-quick">
            <button
              type="button"
              className="a-dash-qbtn"
              onClick={() => void onFetchAll()}
              disabled={fetching}
            >
              <Icon name="refresh" size={14} />
              <span>{fetching ? "…" : t("dash.quick.fetch_all")}</span>
            </button>
            <button
              type="button"
              className="a-dash-qbtn"
              onClick={() => void onAddScanPath()}
              title="Pick a folder to add to your scanned paths"
            >
              <Icon name="plus" size={14} />
              <span>{t("dash.quick.clone")}</span>
            </button>
            <button type="button" className="a-dash-qbtn" onClick={onFindAcrossRepos}>
              <Icon name="search" size={14} />
              <span>{t("dash.quick.find")}</span>
            </button>
            <button
              type="button"
              className="a-dash-qbtn"
              onClick={() => navigate("/repos")}
              title="Open the Repositories view"
            >
              <Icon name="terminal" size={14} />
              <span>{t("dash.quick.workspace")}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

interface KPIProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "accent";
  onClick?: () => void;
}
function KPI({ label, value, sub, tone, onClick }: KPIProps) {
  return (
    <button
      type="button"
      className={`a-dash-kpi${tone ? " t-" + tone : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="a-dash-kpi-l">{label}</div>
      <div className="a-dash-kpi-v">{value}</div>
      {sub && <div className="a-dash-kpi-s">{sub}</div>}
    </button>
  );
}

function AttentionRow({
  repo,
  kind,
  onClick,
}: {
  repo: EnrichedRepo;
  kind: "dirty" | "behind";
  onClick: () => void;
}) {
  return (
    <button type="button" className="a-dash-attn-row" onClick={onClick}>
      <RepoAvatar repo={repo} size={24} radius={5} />
      <div className="a-dash-attn-body">
        <div className="a-dash-attn-name">{repo.name}</div>
        <div className="a-dash-attn-sub">
          {kind === "dirty" ? (
            <>
              {repo.filesChanged} changed ·{" "}
              <span style={{ color: "var(--green)" }}>+{repo.added}</span>{" "}
              <span style={{ color: "var(--red)" }}>−{repo.removed}</span>
            </>
          ) : (
            <>
              {repo.status.behind} commit{repo.status.behind === 1 ? "" : "s"} behind
            </>
          )}
        </div>
      </div>
      <span className={`a-dash-attn-tag t-${kind}`}>{kind}</span>
    </button>
  );
}

function ciToDot(s: string | null): CIState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}
