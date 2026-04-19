import { useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Icon } from "@/components/atoms/Icon";
import { Kbd } from "@/components/atoms/Kbd";
import { IconButton } from "@/components/molecules/IconButton";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { isTauri } from "@/lib/tauri";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { bumpRefreshNonce, setImportDialogOpen, setSearchOpen } from "@/store/slices/uiSlice";

export function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const platform = usePlatform();
  const { title, meta } = useHeaderContext();
  const reposLoading = useAppSelector((s) => s.repos.loading);
  const searchKbd = formatShortcut(platform, { mod: true, key: "K" });

  const onRefresh = () => {
    void dispatch(loadRepos());
    dispatch(bumpRefreshNonce());
  };

  const onAddRepo = () => {
    if (!isTauri()) {
      toast.info("Add repo works in the desktop app only.");
      return;
    }
    dispatch(setImportDialogOpen(true));
  };

  return (
    <div className="a-top">
      <div className="a-top-left">
        <h1 className="a-top-title">{title}</h1>
        {meta && <span className="a-top-meta">{meta}</span>}
      </div>
      <div className="a-top-center">
        <button
          type="button"
          className="a-search"
          onClick={() => dispatch(setSearchOpen(true))}
          aria-label={t("actions.search")}
        >
          <Icon name="search" size={13} />
          <span className="a-search-placeholder">
            {t("actions.search_placeholder", "Search repositories, branches, PRs…")}
          </span>
          <Kbd>{searchKbd}</Kbd>
        </button>
      </div>
      <div className="a-top-right">
        <IconButton
          tooltip={t("actions.refresh")}
          aria-label={t("actions.refresh")}
          onClick={onRefresh}
          disabled={reposLoading}
          data-spinning={reposLoading ? "true" : undefined}
        >
          <Icon name="refresh" size={14} />
        </IconButton>
        <button type="button" className="r-btn primary" onClick={onAddRepo}>
          <Icon name="plus" size={13} />
          {t("actions.add_repo")}
        </button>
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
