import { useState } from "react";

import { useLocation } from "react-router-dom";

import { BookPlus, Globe, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/atoms/Icon";
import { Kbd } from "@/components/atoms/Kbd";
import { IconButton } from "@/components/molecules/IconButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce, setImportDialogOpen, setSearchOpen } from "@/store/slices/uiSlice";

/** G.2: Repo-Add scope toggle. Held in local state — the import dialog
 *  doesn't yet branch on the choice; the "Global" code path lands in a
 *  later phase. The visual affordance ships now so the muscle memory
 *  is in place by the time the backend follows. */
type RepoAddScope = "local" | "global";

export function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const platform = usePlatform();
  const { title, meta } = useHeaderContext();
  const reposLoading = useAppSelector((s) => s.repos.loading);
  const searchKbd = formatShortcut(platform, { mod: true, key: "K" });
  const [addScope, setAddScope] = useState<RepoAddScope>("local");

  const onRefresh = () => {
    // G.1: surface success / failure of the global reload via sonner so the
    // user gets feedback that the click had any effect at all. `loadRepos`
    // is an async thunk; `unwrap()` re-throws the rejection error so the
    // catch branch can describe what went wrong.
    dispatch(bumpRefreshNonce());
    void (async () => {
      try {
        await dispatch(loadRepos()).unwrap();
        toast.success(t("toast.reload.success"));
      } catch (err) {
        const detail =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : String(err ?? "");
        toast.error(t("toast.reload.error", { detail }));
      }
    })();
  };

  const onAddRepo = () => {
    if (!isTauri()) {
      toast.info("Add repo works in the desktop app only.");
      return;
    }
    dispatch(setImportDialogOpen(true));
  };

  const addRepoLabel = t("actions.add_repo");
  const localLabel = t("actions.add_scope.local", { defaultValue: "Local" });
  const globalLabel = t("actions.add_scope.global", { defaultValue: "Global" });
  return (
    <div className="a-top" data-testid="app-header">
      <div className="a-top-left">
        <h1 className="a-top-title" data-testid="app-header-title">
          {title}
        </h1>
        {meta && (
          <span className="a-top-meta hidden min-[721px]:inline" data-testid="app-header-meta">
            {meta}
          </span>
        )}
      </div>
      <div className="a-top-center">
        <button
          type="button"
          className="a-search"
          data-testid="search-trigger"
          onClick={() => dispatch(setSearchOpen(true))}
          aria-label={t("actions.search")}
        >
          <Icon name="search" size={13} />
          <span className="a-search-placeholder">
            {t("actions.search_placeholder", "Search repositories, branches, PRs…")}
          </span>
          <span className="hidden min-[1024px]:inline-flex">
            <Kbd>{searchKbd}</Kbd>
          </span>
        </button>
      </div>
      <div className="a-top-right">
        <IconButton
          tooltip={t("actions.refresh")}
          aria-label={t("actions.refresh")}
          data-testid="btn-refresh"
          onClick={onRefresh}
          disabled={reposLoading}
          data-spinning={reposLoading ? "true" : undefined}
        >
          <Icon name="refresh" size={14} />
        </IconButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="r-btn primary shrink-0"
              data-testid="btn-add-repo"
              onClick={onAddRepo}
              aria-label={addRepoLabel}
            >
              <BookPlus size={14} aria-hidden="true" />
              {/* H.1: hide the label below ~960px and rely on the wrapping
                  Tooltip + aria-label so the button stays accessible. The
                  threshold is one past 960 so the verification viewport
                  (`960px`) renders the icon-only state. */}
              <span className="hidden min-[961px]:inline">{addRepoLabel}</span>
            </button>
          </TooltipTrigger>
          {/* Tooltip is informational only on the wide layout (the label is
              already visible as button text), but it's the primary affordance
              that explains the icon-only button below 960px. Radix shows the
              tooltip in both cases — that's fine: hovering a labelled button
              with a redundant tooltip is benign and matches the rest of the
              toolbar (refresh button has the same pattern). */}
          <TooltipContent side="bottom">{addRepoLabel}</TooltipContent>
        </Tooltip>
        <div
          className="a-topbar-scope seg-group seg-group--square"
          role="group"
          aria-label={t("actions.add_scope_label", { defaultValue: "Add scope" })}
          data-testid="repo-add-scope"
        >
          {/* H.4: Lokal/Global scope toggle. Icons (Monitor/Globe) are always
              visible; the text label collapses below 961px to mirror the
              add-repo button's icon-only breakpoint (H.1). At every width the
              wrapping Tooltip plus aria-label keep the action discoverable. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn("a-topbar-scope-btn seg-btn", addScope === "local" && "is-active")}
                data-testid="repo-add-scope-local"
                aria-pressed={addScope === "local"}
                aria-label={localLabel}
                onClick={() => setAddScope("local")}
              >
                <Monitor size={14} aria-hidden="true" />
                <span className="hidden min-[961px]:inline">{localLabel}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{localLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn("a-topbar-scope-btn seg-btn", addScope === "global" && "is-active")}
                data-testid="repo-add-scope-global"
                aria-pressed={addScope === "global"}
                aria-label={globalLabel}
                onClick={() => setAddScope("global")}
              >
                <Globe size={14} aria-hidden="true" />
                <span className="hidden min-[961px]:inline">{globalLabel}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{globalLabel}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function useHeaderContext(): { title: string; meta: string | null } {
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
    return { title: t("view.activity.title"), meta: t("view.activity.meta") };
  }
  if (path.startsWith("/settings")) {
    return { title: t("view.settings.title"), meta: null };
  }
  return {
    title: t("view.repos.title"),
    meta: t("view.repos.meta", { count: repoList.length, total: repoList.length }),
  };
}
