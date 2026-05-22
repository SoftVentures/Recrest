import { type ReactNode, useState } from "react";

import { NavLink } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, Tooltip, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, type AppRoutePath } from "@recrest/shared";

import {
  Activity as ActivityIcon,
  GitBranch as BranchesIcon,
  Edit3 as ChangesIcon,
  ChevronsLeft,
  ChevronsRight,
  Home as DashboardIcon,
  GitMerge as MergeRequestsIcon,
  BookMarked as ReposIcon,
  Settings as SettingsIcon,
} from "lucide-react";

import Logo from "@/components/atoms/brand/Logo";
import ScopeToggle, { type RepoAddScope } from "@/components/molecules/toggles/ScopeToggle";
import { toggleSidebar } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface NavSpec {
  to: AppRoutePath;
  icon: ReactNode;
  label: string;
  count?: number;
  testId: string;
}

interface CollapsibleProps {
  collapsed: boolean;
}
interface ItemProps extends CollapsibleProps {
  active?: boolean;
}

const SHOULD_FORWARD = (prop: PropertyKey) =>
  prop !== "collapsed" && prop !== "active" && prop !== "isCount";

const Aside = styled("aside", { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ theme, collapsed }) => ({
    // Collapsed: 38px NavItem + 5px each side + 1px right border = 49.
    // Expanded: 192px content + 8px each side + 1px right border = 209.
    width: collapsed ? 49 : 209,
    flexShrink: 0,
    alignSelf: "stretch",
    backgroundColor: theme.palette.surface.interface.navigation,
    borderRight: `1px solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: "column",
    padding: collapsed ? theme.spacing(0, 0.625, 1) : theme.spacing(0, 1, 1),
    minHeight: 0,
    transition: "width 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "visible",
  }),
);

const BrandRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: theme.spacing(8),
  flexShrink: 0,
  gap: theme.spacing(1),
}));

const BrandMark = styled(Logo, { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ collapsed }) => ({
    width: collapsed ? 32 : 40,
    height: collapsed ? 32 : 40,
    flexShrink: 0,
  }),
);

const BrandName = styled(Typography)(({ theme }) => ({
  fontFamily: '"Space Grotesk", system-ui',
  fontSize: 17,
  fontWeight: 700,
  color: theme.palette.text.primary,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  lineHeight: 1,
}));

const Nav = styled("nav", { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ collapsed }) => ({
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    alignItems: collapsed ? "center" : "stretch",
  }),
);

const NavItem = styled(Box, { shouldForwardProp: SHOULD_FORWARD })<ItemProps>(({
  theme,
  collapsed,
  active,
}) => {
  const isDark = theme.palette.mode === "dark";
  return {
    display: "flex",
    alignItems: "center",
    gap: 11,
    height: 38,
    padding: collapsed ? 0 : "0 11px",
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: 8,
    textDecoration: "none",
    // Active state mirrors src-old: subtle canvas-coloured pill with a
    // hairline border-ring (light) or surface-hover bg (dark). The label
    // stays in its normal text colour, just heavier weight — the
    // background change carries the "active" signal without the row
    // having to shout in primary tone.
    color: theme.palette.text.primary,
    backgroundColor: active
      ? isDark
        ? theme.palette.surface.interface.active
        : theme.palette.surface.interface.base
      : "transparent",
    // Sidebar item label sits at 14 / 500 to match the original mocks —
    // 13 px read too thin against the muted sidebar surface.
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    fontFamily: "inherit",
    width: collapsed ? 38 : "100%",
    boxShadow:
      active && !isDark
        ? `0 1px 0 rgba(17,17,22,0.04), 0 0 0 1px ${theme.palette.border.default}`
        : "none",
    position: "relative",
    transition: "background 120ms, color 120ms",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: active
        ? isDark
          ? theme.palette.surface.interface.active
          : theme.palette.surface.interface.base
        : `color-mix(in srgb, ${theme.palette.primary.main} 10%, ${theme.palette.surface.interface.navigation})`,
    },
  };
});

const NavLabel = styled(Box)({
  flex: 1,
  fontSize: 14,
});

const NavCount = styled("span")(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.secondary,
  fontVariantNumeric: "tabular-nums",
}));

const NavDotCount = styled("span")(({ theme }) => ({
  position: "absolute",
  top: 1,
  right: 1,
  minWidth: 14,
  height: 14,
  padding: "0 3px",
  borderRadius: 8,
  fontSize: 9,
  fontWeight: 700,
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledNavLink = styled(NavLink)({
  textDecoration: "none",
  color: "inherit",
});

const FoldButton = styled("button")(({ theme }) => ({
  position: "absolute",
  right: theme.spacing(-1.375),
  bottom: theme.spacing(17.5),
  width: theme.spacing(2.75),
  height: theme.spacing(2.75),
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(17, 17, 22, 0.06)",
  zIndex: 3,
  padding: 0,
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
    borderColor: theme.palette.border.hover,
  },
}));

const Footer = styled(Box, { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ theme, collapsed }) => ({
    flex: "0 0 auto",
    marginLeft: collapsed ? theme.spacing(-0.5) : theme.spacing(-1),
    marginRight: collapsed ? theme.spacing(-0.5) : theme.spacing(-1),
    padding: collapsed ? theme.spacing(2, 0, 1.5) : theme.spacing(2, 1, 1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: collapsed ? "center" : "stretch",
    gap: theme.spacing(1.5),
    "& > a, & > div": {
      width: collapsed ? "auto" : "100%",
    },
  }),
);

const ScopeRow = styled(Box, { shouldForwardProp: SHOULD_FORWARD })<CollapsibleProps>(
  ({ collapsed }) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: collapsed ? "auto" : "100%",
  }),
);

function testIdForRoute(path: string): string {
  return `nav-${path.replace(/^\//, "").replace(/\//g, "-")}`;
}

function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const repos = useAppSelector((s) => s.repos.items);
  const prs = useAppSelector((s) => s.prs.items);
  const connections = useAppSelector((s) => s.providers.connections);
  const [addScope, setAddScope] = useState<RepoAddScope>("local");

  const repoList = Object.values(repos);
  const dirtyCount = repoList.filter((r) => r.status.dirty).length;
  const anyProviderConnected = Object.values(connections).some((c) => c?.connected);
  const connectedRepoIds = new Set(
    repoList.filter((r) => r.providerId && connections[r.providerId]?.connected).map((r) => r.id),
  );
  const mrCount = Object.entries(prs).reduce((sum, [repoId, list]) => {
    if (!connectedRepoIds.has(repoId)) return sum;
    return sum + list.filter((p) => p.state === "open").length;
  }, 0);

  const nav: NavSpec[] = [
    {
      to: AppRoute.DASHBOARD,
      icon: <DashboardIcon size={15} />,
      label: t("nav.dashboard", "Dashboard"),
      testId: testIdForRoute(AppRoute.DASHBOARD),
    },
    {
      to: AppRoute.REPOS,
      icon: <ReposIcon size={15} />,
      label: t("nav.repos", "Repos"),
      count: repoList.length,
      testId: testIdForRoute(AppRoute.REPOS),
    },
    ...(anyProviderConnected
      ? [
          {
            to: AppRoute.MERGE_REQUESTS,
            icon: <MergeRequestsIcon size={15} />,
            label: t("nav.merge_requests", "Merge Requests"),
            count: mrCount,
            testId: testIdForRoute(AppRoute.MERGE_REQUESTS),
          } satisfies NavSpec,
        ]
      : []),
    {
      to: AppRoute.CHANGES,
      icon: <ChangesIcon size={15} />,
      label: t("nav.changes", "Changes"),
      count: dirtyCount,
      testId: testIdForRoute(AppRoute.CHANGES),
    },
    {
      to: AppRoute.BRANCHES,
      icon: <BranchesIcon size={15} />,
      label: t("nav.branches", "Branches"),
      testId: testIdForRoute(AppRoute.BRANCHES),
    },
    {
      to: AppRoute.ACTIVITY,
      icon: <ActivityIcon size={15} />,
      label: t("nav.activity", "Activity"),
      testId: testIdForRoute(AppRoute.ACTIVITY),
    },
  ];

  return (
    <Aside
      aria-label="Primary"
      data-testid="sidebar"
      data-collapsed={collapsed ? "true" : undefined}
      collapsed={collapsed}
    >
      <BrandRow>
        <BrandMark collapsed={collapsed} />
        {!collapsed && <BrandName>Recrest</BrandName>}
      </BrandRow>

      <Nav collapsed={collapsed}>
        {nav.map((item) => {
          const link = (
            <StyledNavLink
              to={item.to}
              data-testid={item.testId}
              end={item.to === AppRoute.DASHBOARD}
            >
              {({ isActive }) => (
                <NavItem collapsed={collapsed} active={isActive}>
                  {item.icon}
                  {!collapsed && <NavLabel>{item.label}</NavLabel>}
                  {!collapsed && item.count != null && (
                    <NavCount data-testid={`${item.testId}-count`}>{item.count}</NavCount>
                  )}
                  {collapsed && item.count != null && item.count > 0 && (
                    <NavDotCount data-testid={`${item.testId}-count`}>{item.count}</NavDotCount>
                  )}
                </NavItem>
              )}
            </StyledNavLink>
          );
          return collapsed ? (
            <Tooltip key={item.to} title={item.label} placement="right" arrow>
              <Box>{link}</Box>
            </Tooltip>
          ) : (
            <Box key={item.to}>{link}</Box>
          );
        })}
      </Nav>

      <Tooltip
        title={collapsed ? t("nav.expand", "Expand") : t("nav.collapse", "Collapse")}
        placement="right"
      >
        <FoldButton
          type="button"
          data-testid="sidebar-fold-btn"
          onClick={() => dispatch(toggleSidebar())}
          aria-label={collapsed ? t("nav.expand", "Expand") : t("nav.collapse", "Collapse")}
        >
          {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </FoldButton>
      </Tooltip>

      <Footer collapsed={collapsed}>
        <ScopeRow collapsed={collapsed}>
          <ScopeToggle
            value={addScope}
            onChange={setAddScope}
            variant={collapsed ? "collapsed" : "expanded"}
          />
        </ScopeRow>
        {(() => {
          const settingsLabel = t("nav.settings", "Settings");
          const settingsLink = (
            <StyledNavLink to={AppRoute.SETTINGS} data-testid="nav-settings">
              {({ isActive }) => (
                <NavItem collapsed={collapsed} active={isActive}>
                  <SettingsIcon size={15} />
                  {!collapsed && <NavLabel>{settingsLabel}</NavLabel>}
                </NavItem>
              )}
            </StyledNavLink>
          );
          return collapsed ? (
            <Tooltip title={settingsLabel} placement="right" arrow>
              <Box>{settingsLink}</Box>
            </Tooltip>
          ) : (
            <Box>{settingsLink}</Box>
          );
        })()}
      </Footer>
    </Aside>
  );
}

export default Sidebar;
