import { useLocation } from "react-router-dom";

import { Plus, RefreshCw, Search, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HEADER_HEIGHT } from "@recrest/shared";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { setSearchOpen } from "@/store/slices/uiSlice";

export function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const selectedRepoId = useAppSelector((s) => s.ui.selectedRepoId);
  const repos = useAppSelector((s) => s.repos.items);

  const crumb = useBreadcrumb(
    location.pathname,
    selectedRepoId ? (repos[selectedRepoId]?.name ?? null) : null,
  );

  return (
    <header
      className="flex items-center gap-3 border-b border-border bg-card px-4"
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{crumb}</div>
      </div>

      <button
        type="button"
        onClick={() => dispatch(setSearchOpen(true))}
        className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground hover:bg-accent"
        aria-label={t("actions.search")}
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span>{t("actions.search")}</span>
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <button
        type="button"
        onClick={() => {
          void dispatch(loadRepos());
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
        aria-label={t("actions.refresh")}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
        aria-label={t("nav.settings")}
      >
        <Settings2 className="h-4 w-4" aria-hidden />
      </button>

      <button
        type="button"
        className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        <span>{t("actions.add_repo")}</span>
      </button>
    </header>
  );
}

function useBreadcrumb(pathname: string, selectedRepoName: string | null): string {
  const { t } = useTranslation();
  if (pathname.startsWith("/pull-requests")) return t("breadcrumb.prs");
  if (pathname.startsWith("/settings")) return t("breadcrumb.settings");
  if (pathname.startsWith("/repos")) {
    return selectedRepoName
      ? t("breadcrumb.repos_selected", { name: selectedRepoName })
      : t("breadcrumb.repos");
  }
  return "";
}
