import { type ReactNode, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { keyframes, styled, useTheme } from "@mui/material/styles";

import { AppRoute } from "@recrest/shared";

import { FolderGit2, GitBranch as MrIcon } from "lucide-react";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import StaggeredReveal from "@/components/atoms/transitions/StaggeredReveal";
import GeneralAuthorAvatar from "@/components/molecules/avatars/GeneralAuthorAvatar";
import GeneralRepoAvatar from "@/components/molecules/avatars/GeneralRepoAvatar";
import EmptyState from "@/components/molecules/feedback/EmptyState";
import {
  ActivityBarsSkeleton,
  CardBlockSkeleton,
  CommitListSkeleton,
  KpiSkeleton,
} from "@/components/molecules/skeletons/DashboardSkeletons";
import HeatmapCard from "@/components/organisms/cards/HeatmapCard";
import LanguageDonutCard from "@/components/organisms/cards/LanguageDonutCard";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useRecentCommits } from "@/hooks/useRecentCommits";
import { computeHeatmap, computeLanguageMix } from "@/lib/activityAggregates";
import {
  PAGE_DUR_MD,
  PAGE_EASE,
  pgRise,
  pgZoom,
  prefersReducedMotionGuard,
} from "@/lib/animations/pageAnimations";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import QuickActionsCard from "@/pages/app/Dashboard/QuickActionsCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedRepo } from "@/store/reducers/uiReducer";

const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  backgroundColor: theme.palette.background.default,
  // The outer ContentScroll is `overflow: hidden` (single-scrollbar policy
  // that keeps page transitions horizontally stable) so the page itself
  // owns scrolling. `scrollbar-gutter: stable` reserves the gutter even
  // when content fits — width matches every other page on swap.
  height: "100%",
  minHeight: 0,
  overflow: "auto",
  scrollbarGutter: "stable",
}));

const Kpis = styled(Box)({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  // Mount stagger: each KPI tile zooms in 50ms after the previous one.
  // Matches src-old `.p-dashboard .a-dash-kpis > *`.
  "& > *": {
    animation: `${pgZoom} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
  },
  "& > *:nth-of-type(1)": { animationDelay: "0ms" },
  "& > *:nth-of-type(2)": { animationDelay: "50ms" },
  "& > *:nth-of-type(3)": { animationDelay: "100ms" },
  "& > *:nth-of-type(4)": { animationDelay: "150ms" },
  ...prefersReducedMotionGuard,
});

const KpiButton = styled("button")(({ theme }) => ({
  textAlign: "left",
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "20px 22px",
  cursor: "pointer",
  // Tween was declared previously but no `transform` ever changed — adding
  // a subtle lift on hover plus an active-state press makes the buttons
  // feel alive without crossing into "bouncy" territory.
  transition:
    "transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.16s ease, border-color 0.12s ease, background 0.12s ease",
  fontFamily: "inherit",
  color: "inherit",
  "&:disabled": { cursor: "default" },
  "&:not(:disabled):hover": {
    borderColor: theme.palette.border.hover,
    backgroundColor: theme.palette.surface.interface.active,
    transform: "translateY(-1px)",
    boxShadow: `0 4px 14px -8px ${theme.palette.common.black}`,
  },
  "&:not(:disabled):active": {
    transform: "translateY(0)",
  },
  // Honour reduced-motion at the per-component layer too — globals.css kills
  // the transition globally, but having the rule here makes the intent
  // explicit when someone reads the component in isolation.
  'html[data-reduced-motion="true"] &': {
    transition: "none",
    "&:not(:disabled):hover": { transform: "none", boxShadow: "none" },
  },
}));

const KpiLabel = styled("div")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
}));

interface KpiValueProps {
  accent?: boolean;
}
const KpiValue = styled("div", {
  shouldForwardProp: (p) => p !== "accent",
})<KpiValueProps>(({ theme, accent }) => ({
  // 44 px / 700 to mirror the original mocks — the KPI number is the
  // dashboard's primary visual anchor and was previously 26 px (too small
  // to carry the hierarchy on a 64 px header).
  fontSize: 44,
  fontWeight: 700,
  color: accent ? theme.palette.primary.main : theme.palette.text.primary,
  letterSpacing: "-0.03em",
  margin: "12px 0 6px",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
}));

const KpiSub = styled("div")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
}));

const KSep = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontWeight: 500,
  margin: "0 2px",
}));

const Grid = styled(Box)({
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gridAutoRows: "min-content",
  gap: 12,
  // Mount stagger: grid cards rise in after the KPI row has settled
  // (220ms base delay), then each subsequent card adds 60ms. Matches
  // src-old `.p-dashboard .a-dash-grid > *`.
  "& > *": {
    animation: `${pgRise} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
    animationDelay: "220ms",
  },
  "& > *:nth-of-type(2)": { animationDelay: "280ms" },
  "& > *:nth-of-type(3)": { animationDelay: "340ms" },
  "& > *:nth-of-type(4)": { animationDelay: "400ms" },
  "& > *:nth-of-type(5)": { animationDelay: "460ms" },
  "& > *:nth-of-type(6)": { animationDelay: "520ms" },
  "& > *:nth-of-type(n + 7)": { animationDelay: "580ms" },
  ...prefersReducedMotionGuard,
});

const Card = styled("section")(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
}));

const CardActivity = styled(Card)({
  gridColumn: "1 / -1",
});

const CardHead = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

const CardTitle = styled("h3")(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  margin: 0,
  letterSpacing: "-0.01em",
}));

const CardMeta = styled("span")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
}));

const CardLink = styled("button")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.primary.main,
  cursor: "pointer",
  background: "transparent",
  border: 0,
  padding: 0,
  fontFamily: "inherit",
  "&:hover": { textDecoration: "underline" },
}));

const Chart = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(14, 1fr)",
  gap: 6,
  height: 96,
  alignItems: "end",
  padding: "4px 0 0",
});

const BarColumn = styled("div")({
  height: "100%",
  display: "flex",
  alignItems: "end",
  // Make the empty space above the bar a hover target too — the tooltip
  // anchors to the column so hovering anywhere inside it should also flip
  // the bar to its highlighted colour (handled by the child `Bar`'s
  // `BarColumn:hover &` rule below).
  cursor: "pointer",
});

// Activity chart bars grow from the baseline on first render so the eye
// follows the data instead of being slammed by a static silhouette. The
// stagger is driven by the per-bar `--bar-index` custom property set inline.
const barGrow = keyframes`
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
`;

const Bar = styled("div")(({ theme }) => ({
  width: "100%",
  minHeight: 4,
  backgroundColor: `color-mix(in srgb, ${theme.palette.primary.main} 18%, transparent)`,
  backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${theme.palette.primary.main} 55%, transparent) 0.6px, transparent 1px)`,
  backgroundSize: "7px 7px",
  border: `1px solid color-mix(in srgb, ${theme.palette.primary.main} 65%, transparent)`,
  borderBottom: 0,
  borderRadius: "8px 8px 0 0",
  transformOrigin: "bottom",
  animation: `${barGrow} 360ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  animationDelay: "calc(var(--bar-index, 0) * 28ms)",
  transition:
    "background-color 0.12s ease, border-color 0.12s ease, height 0.16s cubic-bezier(0.22, 1, 0.36, 1)",
  // The active-bar state is driven by the parent `ActivityChart`'s pointer-
  // tracking via a `data-active` attribute. We toggle the attribute (rather
  // than CSS `:hover`) so the hover region can extend beyond the bar's own
  // box — e.g. into the empty card-padding above the chart — by simply
  // computing which column the cursor is over and flagging it.
  // The `!important` overrides the inline `height` data percentage so the
  // active bar fills the full 96px column.
  "&[data-active='true']": {
    backgroundColor: theme.palette.primary.main,
    backgroundImage: "none",
    borderColor: theme.palette.primary.main,
    height: "100% !important",
  },
  'html[data-reduced-motion="true"] &': {
    animation: "none",
  },
}));

const ChartAxis = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 10,
  color: theme.palette.text.information,
  padding: "0 4px",
}));

const AttnList = styled("div")({
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

const AttnRow = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
  background: "transparent",
  border: 0,
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const AttnBody = styled("div")({
  flex: 1,
  minWidth: 0,
});

const AttnName = styled("div")(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const AttnSub = styled("div")(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
}));

interface AttnTagProps {
  kind: "dirty" | "behind";
}
const AttnTag = styled("span", {
  shouldForwardProp: (p) => p !== "kind",
})<AttnTagProps>(({ theme, kind }) => {
  // Match src-old's `--amber` / `--blue` token palette exactly so the
  // dashboard badges read as the same warm-amber for "dirty" and saturated
  // blue for "behind" across light + dark modes. The `color-mix` against
  // transparent we had before muddied the background into the page tone
  // (orange-brown wash) which read as off-brand.
  const isDark = theme.palette.mode === "dark";
  const palette =
    kind === "dirty"
      ? isDark
        ? { bg: "rgba(255, 179, 71, 0.18)", fg: "#ffb347" }
        : { bg: "#fdf1dc", fg: "#8f4700" }
      : isDark
        ? { bg: "rgba(123, 167, 255, 0.18)", fg: "#7ba7ff" }
        : { bg: "#e8f0ff", fg: "#1e52d4" };
  return {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "2px 8px",
    borderRadius: 100,
    backgroundColor: palette.bg,
    color: palette.fg,
  };
});

const CommitRow = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 8px",
  borderRadius: 8,
  cursor: "pointer",
  background: "transparent",
  border: 0,
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
}));

const CommitBody = styled("div")({
  flex: 1,
  minWidth: 0,
});

const CommitMsg = styled("div")(({ theme }) => ({
  fontSize: 12.5,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const CommitMeta = styled("div")(({ theme }) => ({
  display: "flex",
  gap: 6,
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
}));

const Sep = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
}));

const MrRow = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 8px",
  borderRadius: 8,
  cursor: "pointer",
  background: "transparent",
  border: 0,
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
  "&:hover": { backgroundColor: theme.palette.surface.interface.active },
}));

const MrBody = styled("div")({
  flex: 1,
  minWidth: 0,
});

const MrTitle = styled("div")(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 500,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

const MrMeta = styled("div")(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 2,
}));

type CiState = "passing" | "failing" | "running" | null;

const CiPill = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: theme.palette.text.primary,
  fontWeight: 500,
  flexShrink: 0,
}));

interface CiDotProps {
  state: CiState;
}

// Soft pulse for in-flight CI dots — the ring expands + fades, the core dot
// stays put. 1600ms feels active without being distracting; faster reads as
// "spinner gone wrong".
const ciPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70%  { box-shadow: 0 0 0 5px transparent; opacity: 1; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
`;

const CiDotBase = styled("span", {
  shouldForwardProp: (p) => p !== "state",
})<CiDotProps>(({ theme, state }) => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background:
    state === "passing"
      ? theme.palette.success.main
      : state === "failing"
        ? theme.palette.error.main
        : state === "running"
          ? theme.palette.warning.main
          : theme.palette.text.informationLight,
  // `color` carries the pulse ring colour without re-stating the warning
  // hue inline (the keyframe references `currentColor`).
  color: state === "running" ? `${theme.palette.warning.main}55` : "transparent",
  ...(state === "running"
    ? {
        animation: `${ciPulse} 1600ms ease-out infinite`,
        'html[data-reduced-motion="true"] &': {
          animation: "none",
          boxShadow: `0 0 0 3px ${theme.palette.warning.main}22`,
        },
      }
    : null),
}));

const CiEmpty = styled("span")(({ theme }) => ({
  color: theme.palette.text.informationLight,
  fontSize: 11,
}));

function CiDot({ state }: { state: CiState }) {
  if (!state) return <CiEmpty>—</CiEmpty>;
  return (
    <CiPill>
      <CiDotBase state={state} />
      {state}
    </CiPill>
  );
}

const EmptyText = styled("div")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  padding: "8px 0",
}));

const EmptyCard = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  padding: "32px 20px",
  textAlign: "center",
  color: theme.palette.text.information,
}));

const EmptyTitle = styled("div")(({ theme }) => ({
  fontSize: 14,
  fontWeight: 600,
  color: theme.palette.text.primary,
}));

const EmptyHint = styled("div")({
  fontSize: 12,
  lineHeight: 1.5,
  maxWidth: 360,
});

function ciToDot(s: string | null): CiDotProps["state"] {
  if (s === "success") return "passing";
  if (s === "failure") return "failing";
  if (s === "running" || s === "pending") return "running";
  return null;
}

function DashboardPage() {
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

  // Keep the limit at the default (500) instead of clamping to 6 — the
  // weekday × hour heatmap needs the full 14-day window to fill its 7×24
  // matrix, even though the Recent-commits list only shows the first 6.
  const { commits: recentCommits, loading: commitsLoading } = useRecentCommits({ days: 14 });
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

  // Commit-weighted language mix mirrors the Activity page: per-repo share
  // weighted by the repo's commit count over the window. Donut card collapses
  // the long tail into "Other".
  const reposById = useMemo(() => {
    const m = new Map<string, EnrichedRepo>();
    for (const r of repos) m.set(r.id, r);
    return m;
  }, [repos]);
  const languageMix = useMemo(
    () => computeLanguageMix(recentCommits, reposById),
    [recentCommits, reposById],
  );

  const cleanReposCount = repos.filter((r) => r.clean).length;

  const goto = (repoId: string, path = AppRoute.REPOS) => {
    dispatch(setSelectedRepo(repoId));
    navigate(path);
  };

  // Initial-load skeleton branch — fires once on a cold start. Same card
  // grid shape as the loaded state so the layout doesn't jump when data
  // arrives. We deliberately don't show this for refetches (`loading` flips
  // mid-session) — the user keeps the previous numbers visible while the
  // refresh runs in the background.
  if (reposLoading && repos.length === 0) {
    return (
      <Root data-testid="dashboard-page" aria-busy>
        <Kpis>
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </Kpis>
        <Grid>
          <CardActivity>
            <CardHead>
              <CardTitle>{t("dash.activity.title")}</CardTitle>
            </CardHead>
            <ActivityBarsSkeleton />
          </CardActivity>
          <CardBlockSkeleton rows={3} />
          {anyProviderConnected && <CardBlockSkeleton rows={4} />}
          <CardBlockSkeleton rows={5} />
          <CardBlockSkeleton rows={3} />
          <CardBlockSkeleton rows={3} />
          <CardBlockSkeleton rows={3} />
        </Grid>
      </Root>
    );
  }

  // True empty state: store has finished loading (no longer "loading") AND
  // no repos exist. Don't show this during the initial fetch — that's what
  // skeletons are for. The condition is stable across refreshes because
  // `loading` flips back to false on success even with zero results.
  const isEmptyOnboarding = !reposLoading && repos.length === 0;

  if (isEmptyOnboarding) {
    return (
      <Root data-testid="dashboard-page">
        <Card>
          <EmptyCard>
            <FolderGit2 size={32} strokeWidth={1.4} />
            <EmptyTitle>
              {t("dash.empty.title", { defaultValue: "No repositories yet" })}
            </EmptyTitle>
            <EmptyHint>
              {t("dash.empty.hint", {
                defaultValue:
                  "Add a folder to start tracking. Recrest scans for git repos and surfaces dirty trees, ahead/behind status and open MRs.",
              })}
            </EmptyHint>
            <CardLink type="button" onClick={() => navigate(AppRoute.REPOS)}>
              {t("dash.empty.cta", { defaultValue: "Add repositories" })}
            </CardLink>
          </EmptyCard>
        </Card>
      </Root>
    );
  }

  return (
    <Root data-testid="dashboard-page">
      {/* StaggeredReveal wraps each KPI in a div for the per-item fade.
          We render it through `Kpis` as the container so the CSS grid
          tracks (`repeat(4, 1fr)`) apply to the wrappers — wrappers are
          direct grid children, KPIs sit inside them. */}
      <StaggeredReveal component={Kpis} step={50} maxDelay={200}>
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
            accent
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
              ↑{totalAhead} <KSep>/</KSep> ↓{totalBehind}
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
      </StaggeredReveal>

      <Grid>
        <ActivityChart
          agg={agg}
          maxDay={maxDay}
          title={t("dash.activity.title")}
          meta={t("dash.activity.meta", { total: totalCommits, repos: repos.length })}
        />

        <Card>
          <CardHead>
            <CardTitle>{t("dash.attention.title")}</CardTitle>
            <CardMeta>
              {Math.min(dirtyRepos.length, 3) + Math.min(behindRepos.length, 2)} items
            </CardMeta>
          </CardHead>
          <AttnList>
            {dirtyRepos.slice(0, 3).map((r) => (
              <AttentionRow key={r.id} repo={r} kind="dirty" onClick={() => goto(r.id)} />
            ))}
            {behindRepos.slice(0, 2).map((r) => (
              <AttentionRow key={r.id + "-b"} repo={r} kind="behind" onClick={() => goto(r.id)} />
            ))}
            {dirtyRepos.length === 0 && behindRepos.length === 0 && (
              <EmptyState mascot="celebrating" mascotSize={72} title={t("dash.attention.empty")} />
            )}
          </AttnList>
        </Card>

        {anyProviderConnected && (
          <Card>
            <CardHead>
              <CardTitle>{t("dash.mrs.title")}</CardTitle>
              <CardLink type="button" onClick={() => navigate(AppRoute.MERGE_REQUESTS)}>
                {t("dash.mrs.all")}
              </CardLink>
            </CardHead>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {openPRs.slice(0, 4).map((p) => (
                <MrRow key={p.id} type="button" onClick={() => navigate(AppRoute.MERGE_REQUESTS)}>
                  <MrIcon
                    size={14}
                    color={p.draft ? undefined : "#22c55e"}
                    style={{ flexShrink: 0 }}
                  />
                  <MrBody>
                    <MrTitle>{p.title}</MrTitle>
                    <MrMeta>
                      #{p.number} · {p.author}
                    </MrMeta>
                  </MrBody>
                  <CiDot
                    state={
                      p.ciStatus === "running" || p.ciStatus === "pending"
                        ? null
                        : ciToDot(p.ciStatus)
                    }
                  />
                </MrRow>
              ))}
              {openPRs.length === 0 && (
                <EmptyState mascot="snoozing" mascotSize={72} title={t("dash.mrs.empty")} />
              )}
            </Box>
          </Card>
        )}

        <Card>
          <CardHead>
            <CardTitle>{t("dash.commits.title")}</CardTitle>
            <CardLink type="button" onClick={() => navigate(AppRoute.ACTIVITY)}>
              {t("dash.commits.all")}
            </CardLink>
          </CardHead>
          <Box>
            {commitsInitialLoad ? (
              <CommitListSkeleton rows={6} />
            ) : recent.length === 0 ? (
              <EmptyText>{t("dash.commits.empty", { defaultValue: "—" })}</EmptyText>
            ) : (
              recent.map((c) => (
                <CommitRow key={c.sha} type="button" onClick={() => goto(c.repoId)}>
                  <GeneralAuthorAvatar
                    name={c.author}
                    email={c.authorEmail ?? undefined}
                    size={24}
                  />
                  <CommitBody>
                    <CommitMsg>{c.summary || "—"}</CommitMsg>
                    <CommitMeta>
                      <span>{c.repoName}</span>
                      <Sep>·</Sep>
                      <span>{c.author}</span>
                      <Sep>·</Sep>
                      <span>{c.sha.slice(0, 7)}</span>
                    </CommitMeta>
                  </CommitBody>
                </CommitRow>
              ))
            )}
          </Box>
        </Card>

        {/* Commit-weighted language donut — same component the Activity page
            renders, so the dashboard view matches exactly. */}
        <LanguageDonutCard mix={languageMix} loading={commitsInitialLoad} />

        <QuickActionsCard />

        {/* Weekday × hour heatmap of recent commits, 14-day window. */}
        <HeatmapCard matrix={heatmap} loading={commitsInitialLoad} />
      </Grid>
    </Root>
  );
}

interface KPIProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  onClick?: () => void;
}
function KPI({ label, value, sub, accent, onClick }: KPIProps) {
  return (
    <KpiButton type="button" onClick={onClick} disabled={!onClick}>
      <KpiLabel>{label}</KpiLabel>
      <KpiValue accent={accent}>{value}</KpiValue>
      {sub && <KpiSub>{sub}</KpiSub>}
    </KpiButton>
  );
}

interface AttentionRowProps {
  repo: EnrichedRepo;
  kind: "dirty" | "behind";
  onClick: () => void;
}
function AttentionRow({ repo, kind, onClick }: AttentionRowProps) {
  const theme = useTheme();
  return (
    <AttnRow type="button" onClick={onClick}>
      <GeneralRepoAvatar repo={repo} size={24} radius={5} />
      <AttnBody>
        <AttnName>{repo.name}</AttnName>
        <AttnSub>
          {kind === "dirty" ? (
            <>
              {repo.filesChanged} changed ·{" "}
              <span style={{ color: theme.palette.success.main }}>+{repo.added}</span>{" "}
              <span style={{ color: theme.palette.error.main }}>−{repo.removed}</span>
            </>
          ) : (
            `${repo.status.behind} commit${repo.status.behind === 1 ? "" : "s"} behind`
          )}
        </AttnSub>
      </AttnBody>
      <AttnTag kind={kind}>{kind}</AttnTag>
    </AttnRow>
  );
}

interface ActivityChartProps {
  agg: number[];
  maxDay: number;
  title: string;
  meta: string;
}

/**
 * The activity-chart organism on the dashboard. The whole component is a
 * single pointer-tracking area: mouse position → nearest column index →
 * that bar becomes "active" (fills the column, opaque orange, tooltip
 * anchored above). This means hovering anywhere over the chart's vertical
 * footprint — including the empty space above the data height *and* the
 * area above the chart inside the card — registers as a hover on the
 * column directly below/above the cursor.
 *
 * Why not :hover CSS: per-bar :hover is bound to the bar's box (max 96px
 * × column-width). The user wants the hover-affordance to feel larger
 * than that — pointer-tracking lets us define the hit-region freely
 * without expanding the visual footprint of each bar.
 */
function ActivityChart({ agg, maxDay, title, meta }: ActivityChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const chart = chartRef.current;
    if (!chart) return;
    const rect = chart.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // 14 evenly-spaced columns inside the chart grid (gap is ignored — the
    // visual hover-region is the column track, and tracking on the centre
    // line is fine in practice).
    const col = Math.floor((x / rect.width) * agg.length);
    const clamped = Math.max(0, Math.min(agg.length - 1, col));
    setHovered(clamped);
  };

  const handleLeave = () => setHovered(null);

  return (
    <CardActivity onPointerMove={handleMove} onPointerLeave={handleLeave}>
      <CardHead>
        <CardTitle>{title}</CardTitle>
        <CardMeta>{meta}</CardMeta>
      </CardHead>
      <Chart ref={chartRef}>
        {agg.map((v, i) => {
          const daysAgo = 13 - i;
          const dayLabel =
            daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;
          const isActive = hovered === i;
          return (
            <GeneralTooltip
              key={i}
              open={isActive}
              title={
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                  <Box sx={{ fontWeight: 600 }}>
                    {v} commit{v === 1 ? "" : "s"}
                  </Box>
                  <Box sx={{ fontSize: 10, opacity: 0.7 }}>{dayLabel}</Box>
                </Box>
              }
              placement="top"
            >
              <BarColumn>
                <Bar
                  data-active={isActive ? "true" : undefined}
                  style={
                    {
                      height: `${(v / maxDay) * 100}%`,
                      "--bar-index": i,
                    } as React.CSSProperties
                  }
                />
              </BarColumn>
            </GeneralTooltip>
          );
        })}
      </Chart>
      <ChartAxis>
        <span>14d ago</span>
        <span>7d</span>
        <span>today</span>
      </ChartAxis>
    </CardActivity>
  );
}

export default DashboardPage;
