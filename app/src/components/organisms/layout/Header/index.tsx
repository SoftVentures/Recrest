import { useEffect, useRef, useState } from "react";

import { useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { PrState } from "@recrest/shared";

import { BookPlus, RefreshCw, Search } from "lucide-react";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import {
  AddRepoButton,
  AddRepoLabel,
  CenterSection,
  Kbd,
  LeftSection,
  Meta,
  RefreshButton,
  RightSection,
  SearchPlaceholder,
  SearchTrigger,
  Title,
  TopBar,
} from "@/components/organisms/layout/Header/Header.styles";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { fetchPullRequests } from "@/store/actions/prs.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { bumpRefreshNonce, setImportDialogOpen, setSearchOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
    .filter((p) => p.state === PrState.OPEN).length;

  const path = location.pathname;
  if (path.startsWith("/dashboard")) {
    return {
      title: t("view.dashboard.title"),
      meta: t("view.dashboard.meta", { count: repoList.length }),
    };
  }
  if (path.startsWith("/merge-requests")) {
    return {
      title: t("view.mrs.title"),
      meta: t("view.mrs.meta", { count: mrOpen }),
    };
  }
  if (path.startsWith("/changes")) {
    return {
      title: t("view.changes.title"),
      meta: t("view.changes.meta", { count: dirtyCount }),
    };
  }
  if (path.startsWith("/branches")) {
    return {
      title: t("view.branches.title"),
      meta: t("view.branches.meta", { count: repoList.length }),
    };
  }
  if (path.startsWith("/activity")) {
    return {
      title: t("view.activity.title"),
      meta: t("view.activity.meta"),
    };
  }
  if (path.startsWith("/settings")) {
    return { title: t("view.settings.title"), meta: null };
  }
  // `/repo/:repoId` is the standalone detail view — surface the repo's
  // own name instead of the generic "Repositories" label. `/repos/:repoId`
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
      title: t("view.repos.title"),
      meta: t("view.repos.meta", { count: repoList.length }),
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
    dispatch(bumpRefreshNonce());
    const repoIds = Object.keys(repoItems);
    const promises: Promise<unknown>[] = [
      dispatch(loadRepos()),
      ...repoIds.map((id) => dispatch(fetchPullRequests(id))),
    ];
    void Promise.all(promises).finally(() => {
      setRefreshing((cur) => cur);
    });
  };

  const onAddRepo = () => {
    dispatch(setImportDialogOpen(true));
  };

  const addRepoLabel = t("actions.add_repo");
  const searchLabel = t("actions.search");
  const searchPlaceholder = t("actions.search_placeholder");
  const refreshLabel = t("actions.refresh");

  return (
    <TopBar data-testid={TEST_IDS.header.root}>
      <LeftSection>
        <Title component="h1" data-testid={TEST_IDS.header.title}>
          {title}
        </Title>
        {meta && (
          <Meta component="span" data-testid={TEST_IDS.header.meta}>
            {meta}
          </Meta>
        )}
      </LeftSection>

      <CenterSection>
        <SearchTrigger
          type="button"
          data-testid={TEST_IDS.header.searchTrigger}
          aria-label={searchLabel}
          onClick={() => dispatch(setSearchOpen(true))}
        >
          <Search size={13} />
          <SearchPlaceholder component="span" variant="caption">
            {searchPlaceholder}
          </SearchPlaceholder>
          <Kbd component="kbd">{searchKbd}</Kbd>
        </SearchTrigger>
      </CenterSection>

      <RightSection>
        <GeneralTooltip title={refreshLabel} arrow placement="bottom">
          <RefreshButton
            id="btn-refresh"
            type="button"
            aria-label={refreshLabel}
            data-testid={TEST_IDS.header.btnRefresh}
            disabled={reposLoading}
            spinning={spinning}
            onClick={onRefresh}
          >
            <RefreshCw size={16} aria-hidden />
          </RefreshButton>
        </GeneralTooltip>
        <AddRepoButton
          type="button"
          data-testid={TEST_IDS.header.btnAddRepo}
          aria-label={addRepoLabel}
          onClick={onAddRepo}
        >
          <BookPlus size={14} aria-hidden />
          <AddRepoLabel component="span">{addRepoLabel}</AddRepoLabel>
        </AddRepoButton>
      </RightSection>
    </TopBar>
  );
}

export default Header;
