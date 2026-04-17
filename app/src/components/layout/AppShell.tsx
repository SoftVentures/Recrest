import { type ReactNode, useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDevice } from "@/hooks/useDevice";
import { useSearchHotkey } from "@/hooks/useSearch";
import { useTauri } from "@/hooks/useTauri";
import { useThemeEffect } from "@/hooks/useTheme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale } from "@/store/slices/settingsSlice";
import { setSidebarCollapsed } from "@/store/slices/uiSlice";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Titlebar } from "./Titlebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useThemeEffect();
  useSearchHotkey();
  useLocaleSync();
  useResponsiveSidebar();
  useTauri();

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <Titlebar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto bg-background">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
        <SearchOverlay />
        <OnboardingWizard />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

/**
 * Keeps Redux `settings.locale` and i18next in sync. i18next owns locale
 * persistence (via its own localStorage detector); the store just needs to
 * reflect the active value so components selecting from state render correctly.
 */
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
 * Auto-collapse the sidebar when the viewport falls into mobile/tablet
 * territory, and restore the user's persisted preference when it grows back.
 */
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
    // Only re-evaluate when device category flips — not on every collapsed change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.isMobile, device.isTablet, dispatch]);
}
