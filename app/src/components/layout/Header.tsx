import { useLocation } from "react-router-dom";

import { Menu, Plus, RefreshCw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HEADER_HEIGHT } from "@recrest/shared";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadRepos } from "@/store/slices/reposSlice";
import { setSearchOpen, setSidebarCollapsed } from "@/store/slices/uiSlice";

export function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const selectedRepoId = useAppSelector((s) => s.ui.selectedRepoId);
  const repos = useAppSelector((s) => s.repos.items);

  const crumb = useBreadcrumb(
    location.pathname,
    selectedRepoId ? (repos[selectedRepoId]?.name ?? null) : null,
  );

  return (
    <header
      className="flex items-center gap-2 border-b border-border bg-card px-3 sm:px-4"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Mobile hamburger: toggles the sidebar drawer. md+ users have the
          inline collapse button at the bottom of the sidebar. */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => dispatch(setSidebarCollapsed(!sidebarCollapsed))}
        aria-label={sidebarCollapsed ? t("nav.expand") : t("nav.collapse")}
      >
        <Menu aria-hidden />
      </Button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{crumb}</div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => dispatch(setSearchOpen(true))}
        className="hidden min-w-0 gap-2 text-muted-foreground sm:flex"
        aria-label={t("actions.search")}
      >
        <Search aria-hidden />
        <span className="hidden md:inline">{t("actions.search")}</span>
        <kbd className="ml-1 rounded border border-border bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd>
      </Button>

      {/* Sub-sm: search becomes icon-only */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="sm:hidden"
            onClick={() => dispatch(setSearchOpen(true))}
            aria-label={t("actions.search")}
          >
            <Search aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("actions.search")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void dispatch(loadRepos())}
            aria-label={t("actions.refresh")}
          >
            <RefreshCw aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("actions.refresh")}</TooltipContent>
      </Tooltip>

      <Button size="sm" className="hidden sm:inline-flex">
        <Plus aria-hidden />
        {t("actions.add_repo")}
      </Button>
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
