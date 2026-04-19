import { type ReactNode, useEffect, useRef } from "react";

import { useLocation } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDevice } from "@/hooks/useDevice";
import { useEnrichedRepos } from "@/hooks/useEnrichedRepos";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useSearchHotkey } from "@/hooks/useSearch";
import { useTauri } from "@/hooks/useTauri";
import { useThemeEffect } from "@/hooks/useTheme";
import { useTrayBadgeSync } from "@/hooks/useTrayBadgeSync";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale } from "@/store/slices/settingsSlice";
import { setSidebarCollapsed } from "@/store/slices/uiSlice";
import { setSelectedRepo } from "@/store/slices/uiSlice";

import { DetailPane } from "./DetailPane";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Titlebar } from "./Titlebar";
import { popOutDetailWindow } from "./popout";

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

  const location = useLocation();
  const dispatch = useAppDispatch();
  const selectedRepoId = useAppSelector((s) => s.ui.selectedRepoId);
  const enriched = useEnrichedRepos();
  const canShowDetail =
    location.pathname.startsWith("/repos") || location.pathname.startsWith("/dirty");
  const selectedRepo =
    canShowDetail && selectedRepoId ? enriched.find((r) => r.id === selectedRepoId) : null;
  const detailVisible = selectedRepo != null;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="app">
        <Titlebar />
        <div className="shell">
          <div className={`a-app${detailVisible ? "" : " no-detail"}`}>
            <Sidebar />
            <Header />
            <main className="a-main">
              <div className="a-content-scroll scroll">
                <div className="a-content">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </div>
              </div>
            </main>
            {selectedRepo && (
              <DetailPane
                repo={selectedRepo}
                onClose={() => dispatch(setSelectedRepo(null))}
                onPopOut={() => popOutDetailWindow(selectedRepo.id)}
              />
            )}
          </div>
        </div>
        <SearchOverlay />
        <OnboardingWizard />
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
