import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { AppRoute, TauriCommand } from "@recrest/shared";

import { CiDot, type CiState } from "@/components/atoms/CiDot";
import { Icon } from "@/components/atoms/Icon";
import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";
import { RepoAvatar } from "@/components/molecules/RepoAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { ActivityBarsSkeleton } from "@/components/molecules/skeletons/ActivityBarsSkeleton";
import { CardBlockSkeleton } from "@/components/molecules/skeletons/CardBlockSkeleton";
import { CommitListSkeleton } from "@/components/molecules/skeletons/CommitListSkeleton";
import { KpiSkeleton } from "@/components/molecules/skeletons/KpiSkeleton";
import { HeatmapCard } from "@/components/organisms/activity/cards/HeatmapCard";
import { LanguageDonutCard } from "@/components/organisms/activity/cards/LanguageDonutCard";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { computeHeatmap, computeLanguageMix } from "@/lib/activityAggregates";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import {
  bumpRefreshNonce,
  setFindDialogOpen,
  setImportDialogOpen,
  setSelectedRepo,
} from "@/store/slices/uiSlice";

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const repos = useEnrichedRepos();
  const reposLoading = useAppSelector((s) => s.repos.loading);
  const prsItems = useAppSelector((s) => s.prs.items);
  const prs = Object.values(prsItems).flat();
  const connections = useAppSelector((s) => s.providers.connections);
  const anyProviderConnected = Object.values(connections).some((c) => c?.connected);

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

  // Real recent commits across all repos — Rust sorts newest-first. The
  // "Recent commits" card shows just the top 6, but the weekday×hour heatmap
  // card below needs the full 14-day window to fill its 7×24 matrix — so
  // leave the limit at the default (500) instead of clamping to 6.
  const { commits: recentCommits, loading: commitsLoading } = useRecentCommits({
    days: 14,
  });
  const recent = useMemo(() => {
    const byRepo = new Map(repos.map((r) => [r.id, r] as const));
    return recentCommits.slice(0, 6).map((c) => ({ ...c, repo: byRepo.get(c.repoId) }));
  }, [recentCommits, repos]);
  const commitsInitialLoad = commitsLoading && recent.length === 0;

  const heatmapToday = useMemo(() => new Date(), []);
  const heatmap = useMemo(
    () => computeHeatmap(recentCommits, heatmapToday),
    [recentCommits, heatmapToday],
  );

  // Mirrors the Activity page: commit-weighted language mix using each repo's
  // per-language share so the donut reflects actual contribution rather than
  // a raw "primary language per repo" count.
  const reposById = useMemo(() => {
    const m = new Map<string, EnrichedRepo>();
    for (const r of repos) m.set(r.id, r);
    return m;
  }, [repos]);
  const languageMix = useMemo(
    () => computeLanguageMix(recentCommits, reposById),
    [recentCommits, reposById],
  );

  // For the KPI grid: how many repos are fully in sync (no dirty tree, no
  // ahead/behind, no uncommitted). Complements `repositories_sub` which
  // counts dirty repos.
  const cleanReposCount = repos.filter((r) => r.clean).length;

  const goto = (repoId: string, path = "/repos") => {
    dispatch(setSelectedRepo(repoId));
    navigate(path);
  };

  const [fetching, setFetching] = useState(false);

  const onFetchAll = async () => {
    if (!isTauri()) return;
    setFetching(true);
    try {
      const ok = await invoke<number>(TauriCommand.GIT_FETCH_ALL);
      toast.success(`Fetched ${ok} repo${ok === 1 ? "" : "s"}`);
      void dispatch(loadRepos());
      dispatch(bumpRefreshNonce());
    } catch {
      toast.error("Fetch all failed");
    } finally {
      setFetching(false);
    }
  };

  const onOpenImport = () => dispatch(setImportDialogOpen(true));
  const onFindAcrossRepos = () => dispatch(setFindDialogOpen(true));

  const onOpenWorkspace = async () => {
    const ids = repos.map((r) => r.id);
    if (!isTauri() || ids.length === 0) {
      navigate(AppRoute.REPOS);
      return;
    }
    try {
      await invoke(TauriCommand.CREATE_AND_OPEN_WORKSPACE, { repoIds: ids });
    } catch {
      navigate(AppRoute.REPOS);
    }
  };

  if (reposLoading && repos.length === 0) {
    return (
      <div className="a-dash p-dashboard" data-testid="dashboard-page" aria-busy>
        <div className="a-dash-kpis">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
        <div className="a-dash-grid">
          <section className="a-dash-card a-dash-activity">
            <div className="a-dash-card-h">
              <h3>{t("dash.activity.title")}</h3>
            </div>
            <ActivityBarsSkeleton />
          </section>
          <CardBlockSkeleton rows={3} />
          <CardBlockSkeleton rows={4} />
          <CardBlockSkeleton rows={5} />
          <CardBlockSkeleton rows={3} />
          <CardBlockSkeleton rows={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="a-dash p-dashboard" data-testid="dashboard-page">
      <div className="a-dash-kpis">
        <KPI
          label={t("dash.kpi.repositories")}
          value={repos.length}
          sub={t("dash.kpi.repositories_sub", { count: dirtyRepos.length })}
          onClick={() => navigate(AppRoute.REPOS)}
        />
        {anyProviderConnected ? (
          <KPI
            label={t("dash.kpi.merge_requests")}
            value={openPRs.length}
            sub={t("dash.kpi.merge_requests_sub", { count: prs.filter((p) => p.draft).length })}
            tone="accent"
            onClick={() => navigate(AppRoute.MERGE_REQUESTS)}
          />
        ) : (
          <KPI
            label={t("dash.kpi.clean_repos")}
            value={cleanReposCount}
            sub={t("dash.kpi.clean_repos_sub", {
              count: cleanReposCount,
              total: repos.length,
            })}
            onClick={() => navigate(AppRoute.REPOS)}
          />
        )}
        <KPI
          label={t("dash.kpi.ahead_behind")}
          value={
            <>
              ↑{totalAhead} <span className="a-dash-k-sep">/</span> ↓{totalBehind}
            </>
          }
          sub={t("dash.kpi.ahead_behind_sub")}
          onClick={() => navigate(AppRoute.BRANCHES)}
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
            {agg.map((v, i) => {
              // `agg[0]` is 13 days ago, `agg[13]` is today — translate to a
              // human-readable date so the tooltip answers "when?" not just
              // "how many?".
              const daysAgo = 13 - i;
              const label =
                daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="a-dash-bar-col">
                      <div className="a-dash-bar" style={{ height: `${(v / maxDay) * 100}%` }} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="font-medium">
                      {v} commit{v === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10px] opacity-70">{label}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
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

        {anyProviderConnected && (
          <section className="a-dash-card">
            <div className="a-dash-card-h">
              <h3>{t("dash.mrs.title")}</h3>
              <button
                type="button"
                className="a-dash-link"
                onClick={() => navigate(AppRoute.MERGE_REQUESTS)}
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
                  onClick={() => navigate(AppRoute.MERGE_REQUESTS)}
                >
                  <Icon name="pr" size={14} color={p.draft ? "var(--ink-3)" : "var(--green)"} />
                  <div className="a-dash-mr-body">
                    <div className="a-dash-mr-title">{p.title}</div>
                    <div className="a-dash-mr-meta">
                      #{p.number} · {p.author}
                    </div>
                  </div>
                  <CiDot state={ciToDot(p.ciStatus)} />
                </button>
              ))}
              {openPRs.length === 0 && <div className="a-dash-empty">{t("dash.mrs.empty")}</div>}
            </div>
          </section>
        )}

        <section className="a-dash-card">
          <div className="a-dash-card-h">
            <h3>{t("dash.commits.title")}</h3>
            <button
              type="button"
              className="a-dash-link"
              onClick={() => navigate(AppRoute.ACTIVITY)}
            >
              {t("dash.commits.all")}
            </button>
          </div>
          {/* Skeleton takes the full 6-row height so the card doesn't
              re-layout when the real commits arrive. */}
          <div className="a-dash-commits">
            {commitsInitialLoad ? (
              <CommitListSkeleton rows={6} />
            ) : recent.length === 0 ? (
              <div className="a-dash-empty">{t("dash.commits.empty", { defaultValue: "—" })}</div>
            ) : (
              recent.map((c) => (
                <button
                  key={c.sha}
                  type="button"
                  className="a-dash-commit"
                  onClick={() => goto(c.repoId)}
                >
                  {/* Author avatar is the primary signifier (matches the
                      activity timeline), repo is still identifiable through
                      the inline repo name in the meta row below. */}
                  <AuthorAvatar name={c.author} email={c.authorEmail} size={24} />
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
              ))
            )}
          </div>
        </section>

        {/* Reuse the Activity-page donut so the dashboard's language view
            matches exactly — commit-weighted shares, tail collapsed into
            "Other", same colours. Renders its own `a-act-card` shell. */}
        <LanguageDonutCard mix={languageMix} loading={commitsInitialLoad} />

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
              onClick={onOpenImport}
              title="Clone from a URL or import from GitHub / GitLab / Bitbucket"
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
              onClick={() => void onOpenWorkspace()}
              title="Open a multi-root IDE workspace with all scanned repos"
            >
              <Icon name="terminal" size={14} />
              <span>{t("dash.quick.workspace")}</span>
            </button>
          </div>
        </section>

        {/* HeatmapCard renders its own <div class="a-act-card"> shell —
            wrapping it in another `.a-dash-card` would double the border.
            The className slots it into the dashboard grid and marks it so
            page-level styles can reach it. */}
        <HeatmapCard matrix={heatmap} loading={commitsInitialLoad} />
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

function ciToDot(s: string | null): CiState {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}
