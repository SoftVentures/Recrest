import { useEffect, useRef, useState } from "react";

import { useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

import { BookPlus, RefreshCw, Search } from "lucide-react";

import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { fetchPullRequests } from "@/store/actions/prs.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { bumpRefreshNonce, setImportDialogOpen, setSearchOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const TopBar = styled("div")(({ theme }) => ({
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  // Bumped to 64 px to match the original mocks where the header is the
  // primary visual anchor of the app shell. The taller bar also gives the
  // 38-px buttons room to breathe.
  height: 64,
  paddingLeft: 24,
  paddingRight: 24,
  gap: 16,
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "relative",
  zIndex: 5,
}));

const LeftSection = styled("div")({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "nowrap",
  gap: 10,
  minWidth: 0,
  flex: "0 1 auto",
});

const Title = styled("h1")(({ theme }) => ({
  // Page title at 24 px / 700 — mirrors the original mocks. The header sits
  // on a 64 px bar, so the cap height of the title roughly aligns with the
  // refresh icon's mid-line for visual balance.
  fontSize: 24,
  lineHeight: "30px",
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.4px",
  margin: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
  fontFamily: "inherit",
}));

const Meta = styled("span")(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.secondary,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  flex: "0 0 auto",
  [theme.breakpoints.down(721)]: { display: "none" },
}));

const CenterSection = styled("div")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flex: "1 1 auto",
  minWidth: 0,
});

const SearchTrigger = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 38,
  width: "100%",
  minWidth: "8rem",
  maxWidth: 480,
  flex: "1 1 auto",
  paddingLeft: 12,
  paddingRight: 12,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    borderColor: theme.palette.border.hover,
  },
}));

const SearchPlaceholder = styled("span")(({ theme }) => ({
  flex: "1 1 auto",
  minWidth: 0,
  fontSize: 13,
  color: theme.palette.text.secondary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
}));

const Kbd = styled("kbd")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 18,
  minWidth: 22,
  paddingLeft: 5,
  paddingRight: 5,
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.secondary,
  fontSize: 10,
  fontFamily: "inherit",
  fontWeight: 600,
  [theme.breakpoints.down(1024)]: { display: "none" },
}));

const RightSection = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  flex: "0 0 auto",
});

const AddRepoButton = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 38,
  paddingLeft: 14,
  paddingRight: 14,
  borderRadius: 8,
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  flexShrink: 0,
  transition: "background-color 0.15s ease, border-color 0.15s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
    borderColor: theme.palette.surface.button.ctaHover,
  },
}));

const AddRepoLabel = styled("span")(({ theme }) => ({
  [theme.breakpoints.down(961)]: { display: "none" },
}));

const RefreshButton = styled("button", { shouldForwardProp: (p) => p !== "spinning" })<{
  spinning?: boolean;
}>(({ theme, spinning }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  padding: 0,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  flexShrink: 0,
  transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
    color: theme.palette.text.primary,
  },
  "&:disabled": {
    opacity: 0.6,
    cursor: "default",
  },
  "& svg": {
    transition: "transform 0.2s ease",
    ...(spinning && {
      animation: "headerRefreshSpin 0.9s linear infinite",
    }),
  },
  "@keyframes headerRefreshSpin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
}));

interface HeaderContext {
  title: string;
  meta: string | null;
}

function useHeaderContext(): HeaderContext {
  const { t } = useTranslation();
  const location = useLocation();
  const repos = useAppSelector((s) => s.repos.items);
  const prs = useAppSelector((s) => s.prs.items);
  const repoList = Object.values(repos);
  const dirtyCount = repoList.filter((r) => r.status.dirty).length;
  const mrOpen = Object.values(prs)
    .flat()
    .filter((p) => p.state === "open").length;

  const path = location.pathname;
  if (path.startsWith("/dashboard")) {
    return {
      title: t("view.dashboard.title", "Dashboard"),
      meta: t("view.dashboard.meta", {
        count: repoList.length,
        defaultValue: `${repoList.length} repos`,
      }),
    };
  }
  if (path.startsWith("/merge-requests")) {
    return {
      title: t("view.mrs.title", "Merge Requests"),
      meta: t("view.mrs.meta", { count: mrOpen, defaultValue: `${mrOpen} open` }),
    };
  }
  if (path.startsWith("/changes")) {
    return {
      title: t("view.changes.title", "Changes"),
      meta: t("view.changes.meta", {
        count: dirtyCount,
        defaultValue: `${dirtyCount} with uncommitted changes`,
      }),
    };
  }
  if (path.startsWith("/branches")) {
    return {
      title: t("view.branches.title", "Branches"),
      meta: t("view.branches.meta", {
        count: repoList.length,
        defaultValue: `across ${repoList.length} repos`,
      }),
    };
  }
  if (path.startsWith("/activity")) {
    return {
      title: t("view.activity.title", "Activity"),
      meta: t("view.activity.meta", "last 14 days"),
    };
  }
  if (path.startsWith("/settings")) {
    return { title: t("view.settings.title", "Settings"), meta: null };
  }
  // `/repo/:repoId` is the standalone detail view — surface the repo's
  // own name instead of the generic "Repositories" label so the header
  // tells the user what they're actually looking at. `/repos/:repoId`
  // (plural — list with detail pane) keeps the list-style header.
  if (path.startsWith("/repo/")) {
    const repoId = path.slice("/repo/".length).split("/")[0];
    const repo = repoId ? repos[repoId] : null;
    if (repo) {
      return {
        title: repo.name,
        meta: repo.path,
      };
    }
  }
  if (path.startsWith("/repos") || path.startsWith("/repo/")) {
    return {
      title: t("view.repos.title", "Repositories"),
      meta: t("view.repos.meta", {
        count: repoList.length,
        defaultValue: `${repoList.length} repos`,
      }),
    };
  }
  return { title: "Recrest", meta: null };
}

function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const platform = usePlatform();
  const { title, meta } = useHeaderContext();
  const reposLoading = useAppSelector((s) => s.repos.loading);
  const prsLoading = useAppSelector((s) => s.prs.loading);
  const repoItems = useAppSelector((s) => s.repos.items);
  const searchKbd = formatShortcut(platform, { mod: true, key: "K" });
  const [refreshing, setRefreshing] = useState(false);

  // Spin lives as long as ANY refresh-related work is still in flight: our own
  // dispatched promises, repo polling, PR polling — only then do we cut it off.
  // A minimum of one full rotation (~900ms) keeps the feedback intentional even
  // for cached/instant refreshes.
  const startedAtRef = useRef<number>(0);
  const spinning = refreshing || reposLoading || prsLoading;

  useEffect(() => {
    if (!refreshing) return;
    if (reposLoading || prsLoading) return;
    const elapsed = Date.now() - startedAtRef.current;
    const minSpin = 900;
    if (elapsed >= minSpin) {
      setRefreshing(false);
      return;
    }
    const t = window.setTimeout(() => setRefreshing(false), minSpin - elapsed);
    return () => window.clearTimeout(t);
  }, [refreshing, reposLoading, prsLoading]);

  const onRefresh = () => {
    if (spinning) return;
    startedAtRef.current = Date.now();
    setRefreshing(true);
    // 1. Bump the nonce so commit/PR-event/check-run hooks refetch.
    dispatch(bumpRefreshNonce());
    // 2. Dispatch every async pull we know about in parallel. We deliberately
    //    `Promise.all` so the local `refreshing` flag drops only once every
    //    fetch settles — combined with `reposLoading`/`prsLoading` selectors,
    //    the icon keeps spinning through the slowest call.
    const repoIds = Object.keys(repoItems);
    const promises: Promise<unknown>[] = [
      dispatch(loadRepos()),
      ...repoIds.map((id) => dispatch(fetchPullRequests(id))),
    ];
    void Promise.all(promises).finally(() => {
      // The effect above takes care of enforcing the minimum spin time
      // before actually clearing the flag.
      setRefreshing((cur) => cur);
    });
  };

  const onAddRepo = () => {
    dispatch(setImportDialogOpen(true));
  };

  const addRepoLabel = t("actions.add_repo", "Add repo");
  const searchLabel = t("actions.search", "Search");
  const searchPlaceholder = t("actions.search_placeholder", "Search repositories, branches, PRs…");
  const refreshLabel = t("actions.refresh", "Refresh");

  return (
    <TopBar data-testid="app-header">
      <LeftSection>
        <Title data-testid="app-header-title">{title}</Title>
        {meta && <Meta data-testid="app-header-meta">{meta}</Meta>}
      </LeftSection>

      <CenterSection>
        <SearchTrigger
          type="button"
          data-testid="search-trigger"
          aria-label={searchLabel}
          onClick={() => dispatch(setSearchOpen(true))}
        >
          <Search size={13} />
          <SearchPlaceholder>{searchPlaceholder}</SearchPlaceholder>
          <Kbd>{searchKbd}</Kbd>
        </SearchTrigger>
      </CenterSection>

      <RightSection>
        <Tooltip title={refreshLabel} arrow placement="bottom">
          <RefreshButton
            id="btn-refresh"
            type="button"
            aria-label={refreshLabel}
            data-testid="btn-refresh"
            disabled={reposLoading}
            spinning={spinning}
            onClick={onRefresh}
          >
            <RefreshCw size={16} aria-hidden />
          </RefreshButton>
        </Tooltip>
        <Tooltip title={addRepoLabel} arrow placement="bottom">
          <AddRepoButton
            type="button"
            data-testid="btn-add-repo"
            aria-label={addRepoLabel}
            onClick={onAddRepo}
          >
            <BookPlus size={14} aria-hidden />
            <AddRepoLabel>{addRepoLabel}</AddRepoLabel>
          </AddRepoButton>
        </Tooltip>
      </RightSection>
    </TopBar>
  );
}

export default Header;
