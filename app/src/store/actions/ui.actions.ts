import { createAction } from "@reduxjs/toolkit";

import type { ActiveView, UpdaterBannerState } from "@/store/types/ui.types";

export const toggleSidebar = createAction("ui/toggleSidebar");
export const setSidebarCollapsed = createAction<boolean>("ui/setSidebarCollapsed");

/** Marks a store write as viewport-driven rather than user-driven.
 *  `settingsBackendSync` skips persisting anything carrying it. */
export const TRANSIENT_META = { transient: true } as const;

/**
 * Collapse/expand the sidebar because the viewport demands it, not because the
 * user asked. Same action type (so the reducer needs no special case) plus a
 * `transient` meta flag that keeps `settingsBackendSync` from writing it to
 * settings.json — otherwise one narrow session would overwrite the user's real
 * sidebar preference permanently.
 */
export const setSidebarCollapsedAuto = (collapsed: boolean) => ({
  ...setSidebarCollapsed(collapsed),
  meta: TRANSIENT_META,
});
export const setSearchOpen = createAction<boolean>("ui/setSearchOpen");
export const setActiveView = createAction<ActiveView>("ui/setActiveView");
export const setImportDialogOpen = createAction<boolean>("ui/setImportDialogOpen");
export const bumpRefreshNonce = createAction("ui/bumpRefreshNonce");
export const setUpdaterBanner = createAction<UpdaterBannerState | null>("ui/setUpdaterBanner");
export const togglePinnedRepo = createAction<string>("ui/togglePinnedRepo");
export const setPinnedRepos = createAction<string[]>("ui/setPinnedRepos");
export const setSelectedRepo = createAction<string | null>("ui/setSelectedRepo");
export const setOnboardingOverride = createAction<boolean>("ui/setOnboardingOverride");
