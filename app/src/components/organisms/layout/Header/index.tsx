import { useMemo } from "react";

import { useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { PrState } from "@recrest/shared";

import { BookPlus, RefreshCw, Search } from "lucide-react";

import ActionFeedbackIcon from "@/components/atoms/feedback/ActionFeedbackIcon";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import {
  AddRepoButton,
  AddRepoLabel,
  CenterSection,
  HEADER_REFRESH_SPIN_MS,
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
import { windowDaysOf } from "@/lib/activity/rangeBuckets";
import { SHORTCUT_ID } from "@/lib/constants/shortcuts.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { resolveShortcuts } from "@/lib/utils/shortcuts.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { fetchPullRequests } from "@/store/actions/prs.actions";
import { loadRepos } from "@/store/actions/repos.actions";
import { bumpRefreshNonce, setImportDialogOpen, setSearchOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSelectedRange } from "@/store/selectors/activity.selectors";

interface HeaderContext {
  title: string;
  meta: string | null;
}

function useHeaderContext(): HeaderContext {
  const { t } = useTranslation();
  const location = useLocation();
  const repos = useAppSelector((s) => s.repos.items);
  const prs = useAppSelector((s) => s.prs.items);
  const activityRange = useAppSelector(selectSelectedRange);
  const activityWindowDays = windowDaysOf(activityRange);
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
  // `/mr/:repoId/:prNumber` — the top-bar shows `Merge Request` as the
  // bold title with the `#N` rendered as the small/muted meta (same visual
  // pattern as the list view's "{count} open"). The PR's full title already
  // lives on the detail page itself, so repeating it here would crowd the
  // chrome. Falls back to the plural label until the route param parses.
  if (path.startsWith("/mr/")) {
    const numberRaw = path.slice("/mr/".length).split("/")[1];
    const prNumber = Number(numberRaw);
    if (Number.isFinite(prNumber) && prNumber > 0) {
      return { title: t("view.mr.title"), meta: `#${prNumber}` };
    }
    return {
      title: t("view.mrs.title"),
      meta: t("view.mrs.meta", { count: mrOpen }),
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
      meta: t("view.activity.meta", { days: activityWindowDays }),
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
      // Path is already shown inside the detail page header card — don't
      // repeat it in the top bar.
      return { title: repo.name, meta: null };
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
  const overrides = useAppSelector((s) => s.shortcuts.overrides);
  // Resolve the displayed combos from the same registry the binding hook uses,
  // including any user override, so the header hints can never drift from the
  // real shortcuts.
  const resolved = useMemo(() => resolveShortcuts(overrides), [overrides]);
  const comboHint = (id: (typeof SHORTCUT_ID)[keyof typeof SHORTCUT_ID]) => {
    const c = resolved.find((s) => s.id === id)?.combo;
    return c ? formatShortcut(platform, { ...c, key: c.key.toUpperCase() }) : "";
  };
  const searchKbd = comboHint(SHORTCUT_ID.SEARCH);
  const refresh = useActionFeedback();

  // Show the result glyph (check/cross) once a user-initiated refresh settles;
  // until then the icon keeps the familiar spin. Background loads (poll, nonce
  // bumps elsewhere) still spin via reposLoading/prsLoading but never flash a
  // check — that's reserved for an explicit click on this button.
  const showResult = refresh.state === "success" || refresh.state === "error";
  const busy = refresh.state === "loading" || reposLoading || prsLoading;
  const spinning = busy && !showResult;

  const onRefresh = () => {
    if (busy) return;
    dispatch(bumpRefreshNonce());
    const repoIds = Object.keys(repoItems);
    // Hold the spin for at least two full rotations AND until the real fetch
    // resolves — whichever is longer — before flashing the check. The refresh
    // must actually complete, not just animate.
    const minSpin = new Promise((r) => setTimeout(r, HEADER_REFRESH_SPIN_MS * 2));
    void refresh
      .run(async () => {
        await Promise.all([
          minSpin,
          Promise.all([
            dispatch(loadRepos()),
            ...repoIds.map((id) => dispatch(fetchPullRequests(id))),
          ]),
        ]);
      })
      .catch(() => {});
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
          <Kbd>{searchKbd}</Kbd>
        </SearchTrigger>
      </CenterSection>

      <RightSection>
        <GeneralTooltip title={refreshLabel} arrow placement="bottom">
          {/* Span wrap: `disabled` is dynamic (reposLoading toggles) and MUI Tooltip
              can't attach listeners to a disabled <button>. The inline-flex span
              receives pointer events and forwards them so the tooltip stays alive. */}
          <Box component="span" style={{ display: "inline-flex" }}>
            <RefreshButton
              id="btn-refresh"
              type="button"
              aria-label={refreshLabel}
              data-testid={TEST_IDS.header.btnRefresh}
              disabled={busy}
              spinning={spinning}
              onClick={onRefresh}
            >
              {showResult ? (
                <ActionFeedbackIcon
                  state={refresh.state}
                  fallback={<RefreshCw size={16} aria-hidden />}
                  size={16}
                />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
            </RefreshButton>
          </Box>
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
