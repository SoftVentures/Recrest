import { type ReactNode } from "react";

import { NavLink } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { AppRoute, type AppRoutePath } from "@recrest/shared";

import { Icon, type IconName } from "@/components/atoms/Icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/molecules/compounds/Tooltip";
import { Logo } from "@/components/organisms/brand/Logo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";

interface NavSpec {
  to: AppRoutePath;
  icon: IconName;
  labelKey: string;
  count?: number;
}

function SideItem({
  icon,
  label,
  count,
  active,
  dim,
  onClick,
  collapsed,
  children,
  testId,
}: {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  dim?: boolean;
  onClick?: () => void;
  collapsed: boolean;
  children?: ReactNode;
  testId?: string;
}) {
  const button = (
    <button
      type="button"
      className="a-side-item"
      data-active={active ? "true" : undefined}
      data-dim={dim ? "true" : undefined}
      data-testid={testId}
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
    >
      <Icon name={icon} size={15} />
      {!collapsed && <span className="a-side-label">{label}</span>}
      {!collapsed && count != null && (
        <span className="a-side-count" data-testid={testId ? `${testId}-count` : undefined}>
          {count}
        </span>
      )}
      {collapsed && count != null && count > 0 && (
        <span className="a-side-dot-count" data-testid={testId ? `${testId}-count` : undefined}>
          {count}
        </span>
      )}
      {children}
    </button>
  );
  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function testIdForRoute(path: string): string {
  // AppRoute values are paths like "/repos", "/merge-requests"; strip slash +
  // dedupe dashes to get a stable `nav-<slug>` id.
  return `nav-${path.replace(/^\//, "").replace(/\//g, "-")}`;
}

export function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const repos = useAppSelector((s) => s.repos.items);
  const prs = useAppSelector((s) => s.prs.items);
  const connections = useAppSelector((s) => s.providers.connections);

  const repoList = Object.values(repos);
  const dirtyCount = repoList.filter((r) => r.status.dirty).length;
  const mrCount = Object.values(prs)
    .flat()
    .filter((p) => p.state === "open").length;
  const anyProviderConnected = Object.values(connections).some((c) => c?.connected);

  const nav: NavSpec[] = [
    { to: AppRoute.DASHBOARD, icon: "home", labelKey: "nav.dashboard" },
    { to: AppRoute.REPOS, icon: "repo", labelKey: "nav.repos", count: repoList.length },
    ...(anyProviderConnected
      ? [
          {
            to: AppRoute.MERGE_REQUESTS,
            icon: "pr",
            labelKey: "nav.merge_requests",
            count: mrCount,
          } satisfies NavSpec,
        ]
      : []),
    { to: AppRoute.CHANGES, icon: "edit", labelKey: "nav.changes", count: dirtyCount },
    { to: AppRoute.BRANCHES, icon: "branch", labelKey: "nav.branches" },
    { to: AppRoute.ACTIVITY, icon: "activity", labelKey: "nav.activity" },
  ];

  return (
    <aside
      className={`a-sidebar${collapsed ? " collapsed" : ""}`}
      aria-label="Primary"
      data-testid="sidebar"
      data-collapsed={collapsed ? "true" : undefined}
    >
      <div className="a-side-brand">
        <Logo className="a-brand-mark" />
        {!collapsed && <span className="a-brand-name">Recrest</span>}
      </div>

      <nav className="a-side-nav">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} className="text-inherit no-underline">
            {({ isActive }) => (
              <SideItem
                icon={item.icon}
                label={t(item.labelKey)}
                count={item.count}
                active={isActive}
                collapsed={collapsed}
                testId={testIdForRoute(item.to)}
              />
            )}
          </NavLink>
        ))}
      </nav>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="a-side-fold"
            data-testid="sidebar-fold-btn"
            onClick={() => dispatch(toggleSidebar())}
            aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          >
            <Icon name={collapsed ? "expand" : "collapse"} size={13} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {collapsed ? t("nav.expand") : t("nav.collapse")}
        </TooltipContent>
      </Tooltip>

      <div className="a-side-foot">
        <NavLink to={AppRoute.SETTINGS} className="min-w-0 text-inherit no-underline">
          {({ isActive }) => (
            <SideItem
              icon="settings"
              label={t("nav.settings")}
              active={isActive}
              collapsed={collapsed}
              testId="nav-settings"
            />
          )}
        </NavLink>
      </div>
    </aside>
  );
}
