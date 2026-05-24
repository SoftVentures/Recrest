import { useEffect, useRef, useState } from "react";
import { type ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { AppRoute, type AppRoutePath, PrState } from "@recrest/shared";

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
import { useAnimate } from "motion/react";

import ScopeButtonGroup, { RepoAddScope } from "@/components/atoms/buttons/ScopeButtonGroup";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import {
  Aside,
  BrandMark,
  BrandName,
  BrandRow,
  FoldButton,
  Footer,
  Nav,
  NavCount,
  NavDotCount,
  NavItem,
  NavLabel,
  ScopeRow,
  StyledNavLink,
} from "@/components/organisms/layout/Sidebar/Sidebar.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS, navCountTestId, navTestId } from "@/lib/constants/testIds.constants";
import { toggleSidebar } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface NavSpec {
  to: AppRoutePath;
  icon: ReactNode;
  label: string;
  count?: number;
  testId: string;
}

function Sidebar() {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const repos = useAppSelector((s) => s.repos.items);
  const prs = useAppSelector((s) => s.prs.items);
  const connections = useAppSelector((s) => s.providers.connections);
  const [addScope, setAddScope] = useState<RepoAddScope>(RepoAddScope.LOCAL);

  // framer-motion drives width via `useAnimate` on the ref directly. Setting
  // `style={{ width }}` in JSX would race against motion — every re-render
  // would force-set the final width and abort the in-flight interpolation.
  // Only padding is driven from React; width lives entirely on the DOM node
  // via the animate() call.
  // Collapsed: 49px (38 + side padding + border); expanded: 209.
  const [scope, animate] = useAnimate<HTMLElement>();
  const padX = collapsed ? theme.spacing(0.625) : theme.spacing(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!scope.current) return;
    const target = collapsed ? 49 : 209;
    if (isFirstRender.current) {
      // Skip the animation on mount so the Aside doesn't visibly grow from 0.
      scope.current.style.width = `${target}px`;
      isFirstRender.current = false;
      return;
    }
    void animate(
      scope.current,
      { width: target },
      { type: "tween", duration: 0.18, ease: [0.32, 0.72, 0, 1] },
    );
  }, [animate, collapsed, scope]);

  const repoList = Object.values(repos);
  const dirtyCount = repoList.filter((r) => r.status.dirty).length;
  const anyProviderConnected = Object.values(connections).some((c) => c?.connected);
  const connectedRepoIds = new Set(
    repoList.filter((r) => r.providerId && connections[r.providerId]?.connected).map((r) => r.id),
  );
  const mrCount = Object.entries(prs).reduce((sum, [repoId, list]) => {
    if (!connectedRepoIds.has(repoId)) return sum;
    return sum + list.filter((p) => p.state === PrState.OPEN).length;
  }, 0);

  const nav: NavSpec[] = [
    {
      to: AppRoute.DASHBOARD,
      icon: <DashboardIcon size={15} />,
      label: t("nav.dashboard"),
      testId: navTestId(AppRoute.DASHBOARD),
    },
    {
      to: AppRoute.REPOS,
      icon: <ReposIcon size={15} />,
      label: t("nav.repos"),
      count: repoList.length,
      testId: navTestId(AppRoute.REPOS),
    },
    ...(anyProviderConnected
      ? [
          {
            to: AppRoute.MERGE_REQUESTS,
            icon: <MergeRequestsIcon size={15} />,
            label: t("nav.merge_requests"),
            count: mrCount,
            testId: navTestId(AppRoute.MERGE_REQUESTS),
          } satisfies NavSpec,
        ]
      : []),
    {
      to: AppRoute.CHANGES,
      icon: <ChangesIcon size={15} />,
      label: t("nav.changes"),
      count: dirtyCount,
      testId: navTestId(AppRoute.CHANGES),
    },
    {
      to: AppRoute.BRANCHES,
      icon: <BranchesIcon size={15} />,
      label: t("nav.branches"),
      testId: navTestId(AppRoute.BRANCHES),
    },
    {
      to: AppRoute.ACTIVITY,
      icon: <ActivityIcon size={15} />,
      label: t("nav.activity"),
      testId: navTestId(AppRoute.ACTIVITY),
    },
  ];

  return (
    <Aside
      ref={scope}
      aria-label={t("sidebar.primary", { ns: I18nNamespace.ARIA })}
      data-testid={TEST_IDS.sidebar.root}
      data-collapsed={collapsed ? "true" : undefined}
      style={{ paddingLeft: padX, paddingRight: padX }}
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
                    <NavCount
                      component="span"
                      variant="caption"
                      data-testid={navCountTestId(item.to)}
                    >
                      {item.count}
                    </NavCount>
                  )}
                  {collapsed && item.count != null && item.count > 0 && (
                    <NavDotCount
                      component="span"
                      variant="caption"
                      data-testid={navCountTestId(item.to)}
                    >
                      {item.count}
                    </NavDotCount>
                  )}
                </NavItem>
              )}
            </StyledNavLink>
          );
          return collapsed ? (
            <GeneralTooltip key={item.to} title={item.label} placement="right" arrow>
              <Box>{link}</Box>
            </GeneralTooltip>
          ) : (
            <Box key={item.to}>{link}</Box>
          );
        })}
      </Nav>

      <GeneralTooltip title={collapsed ? t("nav.expand") : t("nav.collapse")} placement="right">
        <FoldButton
          type="button"
          data-testid={TEST_IDS.sidebar.foldBtn}
          onClick={() => dispatch(toggleSidebar())}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
        >
          {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </FoldButton>
      </GeneralTooltip>

      <Footer collapsed={collapsed}>
        <ScopeRow collapsed={collapsed}>
          <ScopeButtonGroup
            value={addScope}
            onChange={setAddScope}
            variant={collapsed ? "collapsed" : "expanded"}
          />
        </ScopeRow>
        {(() => {
          const settingsLabel = t("nav.settings");
          const settingsLink = (
            <StyledNavLink to={AppRoute.SETTINGS} data-testid={TEST_IDS.sidebar.navSettings}>
              {({ isActive }) => (
                <NavItem collapsed={collapsed} active={isActive} forceBorder>
                  <SettingsIcon size={15} />
                  {!collapsed && <NavLabel>{settingsLabel}</NavLabel>}
                </NavItem>
              )}
            </StyledNavLink>
          );
          return collapsed ? (
            <GeneralTooltip title={settingsLabel} placement="right" arrow>
              <Box>{settingsLink}</Box>
            </GeneralTooltip>
          ) : (
            <Box>{settingsLink}</Box>
          );
        })()}
      </Footer>
    </Aside>
  );
}

export default Sidebar;
