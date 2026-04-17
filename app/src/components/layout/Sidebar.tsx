import { NavLink } from "react-router-dom";

import {
  ChevronLeft,
  ChevronRight,
  GitPullRequest,
  LayoutGrid,
  Settings,
  Workflow,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { APP_NAME, SIDEBAR_WIDTH } from "@recrest/shared";

import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSidebarCollapsed, toggleSidebar } from "@/store/slices/uiSlice";

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutGrid;
  disabled?: boolean;
  badgeKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/repos", labelKey: "nav.repos", icon: LayoutGrid },
  { to: "/pull-requests", labelKey: "nav.prs", icon: GitPullRequest },
  {
    to: "/pipelines",
    labelKey: "nav.pipelines",
    icon: Workflow,
    disabled: true,
    badgeKey: "nav.pipelines_coming_soon",
  },
];

export function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const groups = useAppSelector((s) => s.repos.groups);

  // On md+ the sidebar lives in the grid; on smaller screens it's an overlay
  // anchored to the left edge. Width still driven by the collapsed state so
  // the same state covers both use cases.
  const width = collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;

  const closeMobile = () => dispatch(setSidebarCollapsed(true));

  return (
    <>
      {/* Backdrop on mobile when expanded */}
      {!collapsed && (
        <div
          aria-hidden
          onClick={closeMobile}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col border-r border-border bg-card text-card-foreground shadow-[var(--shadow-md)] transition-[width,transform] duration-200",
          "md:static md:z-0 md:shadow-none",
          collapsed && "max-md:-translate-x-full",
        )}
        style={{ width }}
        aria-label="Primary"
      >
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-3",
            collapsed && "md:justify-center md:px-0",
          )}
        >
          <Logo className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  aria-disabled={item.disabled}
                  onClick={() => {
                    if (window.matchMedia("(max-width: 767px)").matches) closeMobile();
                  }}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive && !item.disabled && "bg-accent text-accent-foreground",
                      item.disabled && "pointer-events-none opacity-50",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed && (
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                  )}
                  {!collapsed && item.badgeKey && (
                    <Badge variant="muted" size="sm" className="uppercase">
                      {t(item.badgeKey)}
                    </Badge>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {!collapsed && Object.keys(groups).length > 0 && (
            <div className="mt-6">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("nav.groups")}
              </div>
              <ul className="space-y-1">
                {Object.values(groups).map((group) => (
                  <li
                    key={group.id}
                    className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: group.color }}
                      aria-hidden
                    />
                    <span className="truncate">{group.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="border-t border-border p-2">
          <NavLink
            to="/settings"
            onClick={() => {
              if (window.matchMedia("(max-width: 767px)").matches) closeMobile();
            }}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive && "bg-accent text-accent-foreground",
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed && <span>{t("nav.settings")}</span>}
          </NavLink>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="mt-1 hidden w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
            aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span>{t("nav.collapse")}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
