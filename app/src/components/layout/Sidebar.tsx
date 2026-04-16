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

import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";

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

  const width = collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-border bg-card text-card-foreground transition-[width] duration-200"
      style={{ width }}
      aria-label="Primary"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          R
        </div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-disabled={item.disabled}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && !item.disabled && "bg-accent text-accent-foreground",
                    item.disabled && "pointer-events-none opacity-50",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {!collapsed && <span className="flex-1 truncate">{t(item.labelKey)}</span>}
                {!collapsed && item.badgeKey && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t(item.badgeKey)}
                  </span>
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
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
              "hover:bg-accent hover:text-accent-foreground",
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
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
  );
}
