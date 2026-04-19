import { type ReactNode } from "react";

import { NavLink, useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { BrandMark } from "@/components/brand/BrandMark";
import { Icon, type IconName } from "@/components/icons/Icon";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";

interface NavSpec {
  to: string;
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
}: {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  dim?: boolean;
  onClick?: () => void;
  collapsed: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className="a-side-item"
      data-active={active ? "true" : undefined}
      data-dim={dim ? "true" : undefined}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <Icon name={icon} size={15} />
      {!collapsed && <span className="a-side-label">{label}</span>}
      {!collapsed && count != null && <span className="a-side-count">{count}</span>}
      {collapsed && count != null && count > 0 && <span className="a-side-dot-count">{count}</span>}
      {children}
    </button>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const repos = useAppSelector((s) => s.repos.items);
  const prs = useAppSelector((s) => s.prs.items);

  const repoList = Object.values(repos);
  const dirtyCount = repoList.filter((r) => r.status.dirty).length;
  const mrCount = Object.values(prs)
    .flat()
    .filter((p) => p.state === "open").length;

  const nav: NavSpec[] = [
    { to: "/dashboard", icon: "home", labelKey: "nav.dashboard" },
    { to: "/repos", icon: "folder", labelKey: "nav.repos", count: repoList.length },
    { to: "/merge-requests", icon: "pr", labelKey: "nav.merge_requests", count: mrCount },
    { to: "/dirty", icon: "dot", labelKey: "nav.dirty", count: dirtyCount },
    { to: "/branches", icon: "branch", labelKey: "nav.branches" },
    { to: "/activity", icon: "activity", labelKey: "nav.activity" },
  ];

  return (
    <aside className={`a-sidebar${collapsed ? " collapsed" : ""}`} aria-label="Primary">
      <div className="a-side-brand">
        <span className="a-brand-mark">
          <BrandMark size={16} stroke="var(--brand-ink)" strokeWidth={72} />
        </span>
        {!collapsed && <span className="a-brand-name">Recrest</span>}
      </div>

      <nav className="a-side-nav">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} style={{ textDecoration: "none", color: "inherit" }}>
            {({ isActive }) => (
              <SideItem
                icon={item.icon}
                label={t(item.labelKey)}
                count={item.count}
                active={isActive}
                collapsed={collapsed}
              />
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="a-side-fold"
        onClick={() => dispatch(toggleSidebar())}
        title={collapsed ? t("nav.expand") : t("nav.collapse")}
        aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
      >
        <Icon name={collapsed ? "expand" : "collapse"} size={13} />
      </button>

      <div className="a-side-foot">
        <NavLink to="/settings" style={{ textDecoration: "none", color: "inherit", minWidth: 0 }}>
          {({ isActive }) => (
            <SideItem
              icon="settings"
              label={t("nav.settings")}
              active={isActive}
              collapsed={collapsed}
              onClick={() => navigate("/settings")}
            />
          )}
        </NavLink>
      </div>
    </aside>
  );
}
