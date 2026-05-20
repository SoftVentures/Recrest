import { type ReactNode, useEffect, useRef } from "react";

import { useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { AppRoute } from "@recrest/shared";

import { Toaster } from "@/components/molecules/Sonner";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { ErrorBoundary } from "@/components/organisms/feedback/ErrorBoundary";
import { UpdaterBanner } from "@/components/organisms/feedback/UpdaterBanner";
import { DetailPane } from "@/components/organisms/layout/DetailPane";
import { Header } from "@/components/organisms/layout/Header";
import { Sidebar } from "@/components/organisms/layout/Sidebar";
import { Titlebar } from "@/components/organisms/layout/Titlebar";
import { MergeRequestDetailPanel } from "@/components/organisms/mergeRequests/MergeRequestDetailPanel";
import { OnboardingWizard } from "@/components/organisms/onboarding/OnboardingWizard";
import { FindAcrossReposDialog } from "@/components/organisms/repos/FindAcrossReposDialog";
import { ImportFromProviderDialog } from "@/components/organisms/repos/ImportFromProviderDialog";
import { SearchOverlay } from "@/components/organisms/search/SearchOverlay";
import { useDevice } from "@/hooks/useDevice";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useGlobalEvents } from "@/hooks/useGlobalEvents";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useNotificationTriggers } from "@/hooks/useNotificationTriggers";
import { usePageSwipe } from "@/hooks/usePageSwipe";
import { useWindowChrome } from "@/hooks/usePlatform";
import { usePrPolling } from "@/hooks/useProviders";
import { useSearchHotkey } from "@/hooks/useSearch";
import { useTauri } from "@/hooks/useTauri";
import { useThemeEffect } from "@/hooks/useTheme";
import { useTrayBadgeSync } from "@/hooks/useTrayBadgeSync";
import { isTauri } from "@/lib/tauri";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale } from "@/store/slices/settingsSlice";
import { setSelectedPr, setSelectedRepo, setSidebarCollapsed } from "@/store/slices/uiSlice";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useThemeEffect();
  useSearchHotkey();
  useGlobalShortcuts();
  useLocaleSync();
  useResponsiveSidebar();
  useTauri();
  useTrayBadgeSync();
  useGlobalEvents();
  useNotificationTriggers(isTauri());
  useChromeAttribute();
  usePrPolling();
  // D.5: horizontal touch swipes navigate Activity ↔ Repos ↔ MRs ↔ Branches.
  usePageSwipe();

  const location = useLocation();
  const dispatch = useAppDispatch();
  const selectedRepoId = useAppSelector((s) => s.ui.selectedRepoId);
  const selectedPrKey = useAppSelector((s) => s.ui.selectedPrKey);
  const prsItems = useAppSelector((s) => s.prs.items);
  const repos = useAppSelector((s) => s.repos.items);
  const enriched = useEnrichedRepos();
  const canShowRepoDetail =
    location.pathname.startsWith(AppRoute.REPOS) || location.pathname.startsWith(AppRoute.CHANGES);
  const selectedRepo =
    canShowRepoDetail && selectedRepoId ? enriched.find((r) => r.id === selectedRepoId) : null;

  const onMrRoute = location.pathname.startsWith(AppRoute.MERGE_REQUESTS);
  const selectedMr = (() => {
    if (!onMrRoute || !selectedPrKey) return null;
    const hashIdx = selectedPrKey.indexOf("#");
    if (hashIdx <= 0) return null;
    const repoId = selectedPrKey.slice(0, hashIdx);
    const prNumber = Number(selectedPrKey.slice(hashIdx + 1));
    const pr = (prsItems[repoId] ?? []).find((p) => p.number === prNumber);
    if (!pr) return null;
    return { pr, repoId, repoName: repos[repoId]?.name ?? repoId };
  })();
  const detailVisible = selectedRepo != null || selectedMr != null;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="app" data-testid="app">
        <Titlebar />
        <div className="shell">
          <div className={`a-app${detailVisible ? "" : " no-detail"}`}>
            <Sidebar />
            <Header />
            <main className="a-main" data-testid="app-main">
              <div className="a-content-scroll scroll">
                <div className="a-content">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </div>
              </div>
            </main>
            {selectedRepo && (
              <DetailPane repo={selectedRepo} onClose={() => dispatch(setSelectedRepo(null))} />
            )}
            {selectedMr && (
              <aside className="a-detail" data-testid="mr-detail-pane">
                <MergeRequestDetailPanel
                  pr={selectedMr.pr}
                  repoId={selectedMr.repoId}
                  repoName={selectedMr.repoName}
                  onClose={() => dispatch(setSelectedPr(null))}
                />
              </aside>
            )}
          </div>
        </div>
        <SearchOverlay />
        <OnboardingWizard />
        <ImportFromProviderDialog />
        <FindAcrossReposDialog />
        <UpdaterBanner />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

function useLocaleSync(): void {
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const storeLocale = useAppSelector((s) => s.settings.locale);

  useEffect(() => {
    if (i18n.language && i18n.language !== storeLocale) {
      dispatch(setLocale(i18n.language));
    }
    const handler = (lng: string) => dispatch(setLocale(lng));
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, [dispatch, i18n, storeLocale]);
}

/**
 * Spiegelt den aktiven Chrome-Variante auf `<html data-chrome="…">`, damit
 * globale CSS-Regeln (z. B. Border-Radius) plattformspezifisch greifen können.
 */
function useChromeAttribute(): void {
  const chrome = useWindowChrome();
  useEffect(() => {
    document.documentElement.dataset.chrome = chrome;
    return () => {
      delete document.documentElement.dataset.chrome;
    };
  }, [chrome]);
}

function useResponsiveSidebar(): void {
  const device = useDevice();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const userPrefRef = useRef(collapsed);
  const forcedRef = useRef(false);

  useEffect(() => {
    const narrow = device.isMobile || device.isTablet;
    if (narrow && !collapsed) {
      userPrefRef.current = collapsed;
      forcedRef.current = true;
      dispatch(setSidebarCollapsed(true));
    } else if (!narrow && forcedRef.current) {
      forcedRef.current = false;
      dispatch(setSidebarCollapsed(userPrefRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.isMobile, device.isTablet, dispatch]);
}
