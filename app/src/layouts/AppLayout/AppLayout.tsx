import { useEffect } from "react";

import { Outlet, useLocation } from "react-router-dom";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import PageTransition from "@/components/atoms/transitions/PageTransition";
import GeneralToaster from "@/components/molecules/feedback/GeneralToaster";
import AddRepoModal from "@/components/molecules/modals/AddRepoModal";
import OverallSearch from "@/components/organisms/OverallSearch";
import UpdaterBanner from "@/components/organisms/banners/UpdaterBanner";
import Header from "@/components/organisms/layout/Header";
import Sidebar from "@/components/organisms/layout/Sidebar";
import OnboardingWizard from "@/components/organisms/onboarding/OnboardingWizard";
import FindAcrossReposDialog from "@/components/organisms/repos/FindAcrossReposDialog";
import Titlebar from "@/components/organisms/titlebars/Titlebar";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import { useFaviconSync } from "@/hooks/useFaviconSync";
import { useLocaleSync } from "@/hooks/useLocaleSync";
import { usePageSwipe } from "@/hooks/usePageSwipe";
import { useWindowChrome } from "@/hooks/usePlatform";
import { usePrPolling } from "@/hooks/usePrPolling";
import { useResponsiveSidebar } from "@/hooks/useResponsiveSidebar";
import { useScrollbarWidth } from "@/hooks/useScrollbarWidth";
import { useThemeAttribute } from "@/hooks/useThemeAttribute";
import { WINDOW_CHROME_HEIGHT_PX } from "@/lib/constants/platform.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { setFindDialogOpen } from "@/store/actions/ui.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const AppFrame = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  width: "100%",
  minHeight: 0,
  overflow: "hidden",
  backgroundColor: theme.palette.background.default,
})) as typeof Box;

const Shell = styled(Box)({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gridTemplateRows: "auto 1fr",
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden",
}) as typeof Box;

const SidebarSlot = styled(Box)({
  gridColumn: 1,
  gridRow: "1 / span 2",
  minHeight: 0,
  display: "flex",
}) as typeof Box;

const HeaderSlot = styled(Box)({
  gridColumn: "2 / -1",
  gridRow: 1,
  minWidth: 0,
}) as typeof Box;

const MainSlot = styled(Box)(({ theme }) => ({
  gridColumn: 2,
  gridRow: 2,
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.default,
  overflow: "hidden",
})) as typeof Box;

/**
 * Single scroll surface for every page (mirrors src-old's `.a-content-scroll`).
 * Pages do NOT scroll internally — they let this container handle it so the
 * scrollbar always sits flush against the viewport edge and page transitions
 * don't trigger a brief "phantom" scrollbar from a competing inner scroller.
 *
 * Exception: Settings runs a two-pane layout (sticky tab-nav + scrolling body)
 * and opts out by setting `data-fullbleed="true"` on this element via the
 * `useFullbleedScroll` hook. When that attribute is present we drop the outer
 * scroll so Settings can own scrolling internally without a double scrollbar.
 */
const ContentScroll = styled(Box)({
  flex: 1,
  minHeight: 0,
  // Outer scroll surface. Each page owns its own internal scroller
  // (overflow:auto + scrollbarGutter:stable on the page's Root) so the
  // scrollbar always lives in the same horizontal slot regardless of
  // whether the active page's content currently overflows. This keeps
  // page transitions horizontally stable — no left/right jump from a
  // gutter appearing or disappearing.
  //
  // `overflow: hidden` here is deliberate: a `data-fullbleed="true"`
  // page (Settings' two-pane layout) requests it explicitly, and every
  // other page already owns scrolling internally — having the outer be
  // hidden as the default removes a redundant scroller that would
  // otherwise add a second gutter on top of the inner one.
  overflow: "hidden",
}) as typeof Box;

export function AppLayout() {
  useAppBootstrap();
  useThemeAttribute();
  useFaviconSync();
  useLocaleSync();
  useResponsiveSidebar();
  useScrollbarWidth();
  usePrPolling();
  usePageSwipe();
  // Keying `PageTransition` on the current pathname makes React unmount the
  // previous route's tree and remount the next one — so the enter animation
  // re-fires on every navigation, not just on the initial app boot. Pages
  // that wrap themselves in `PageTransition` again (e.g. Dashboard's empty
  // state branch) compose harmlessly: a fade-in inside a fade-in is just
  // the inner one.
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const findDialogOpen = useAppSelector((s) => s.ui.findDialogOpen);
  const chrome = useWindowChrome();
  const chromeHeight = WINDOW_CHROME_HEIGHT_PX[chrome];

  // The custom OS titlebar (when present) sits above the app header, so any
  // portal-mounted overlay that wants to start "below the chrome" needs the
  // combined offset. Expose it as a CSS var on :root so MUI's portal-mounted
  // Drawer/Modal can read it without prop-drilling.
  useEffect(() => {
    const value = `${chromeHeight + 64}px`;
    document.documentElement.style.setProperty("--recrest-app-chrome-bottom", value);
    return () => {
      document.documentElement.style.removeProperty("--recrest-app-chrome-bottom");
    };
  }, [chromeHeight]);

  // Cmd+Shift+F / Ctrl+Shift+F opens the cross-repo search. Plain Cmd+F stays
  // free for the host browser's find-in-page (when running under `dev:web`).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        dispatch(setFindDialogOpen(true));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <AppFrame data-testid={TEST_IDS.app}>
      <Titlebar />
      <Shell>
        <SidebarSlot>
          <Sidebar />
        </SidebarSlot>
        <HeaderSlot>
          <Header />
        </HeaderSlot>
        <MainSlot component="main" data-testid={TEST_IDS.appMain}>
          <UpdaterBanner />
          <ContentScroll data-content-scroll>
            <PageTransition key={pathname}>
              <Outlet />
            </PageTransition>
          </ContentScroll>
        </MainSlot>
      </Shell>
      <OverallSearch />
      <AddRepoModal />
      <OnboardingWizard />
      <FindAcrossReposDialog
        open={findDialogOpen}
        onClose={() => dispatch(setFindDialogOpen(false))}
      />
      <GeneralToaster />
    </AppFrame>
  );
}
