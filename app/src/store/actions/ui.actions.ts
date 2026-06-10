import { createAction } from "@reduxjs/toolkit";

import type { ActiveView, UpdaterBannerState } from "@/store/types/ui.types";

export const toggleSidebar = createAction("ui/toggleSidebar");
export const setSidebarCollapsed = createAction<boolean>("ui/setSidebarCollapsed");
export const setSearchOpen = createAction<boolean>("ui/setSearchOpen");
export const setActiveView = createAction<ActiveView>("ui/setActiveView");
export const setImportDialogOpen = createAction<boolean>("ui/setImportDialogOpen");
export const setFindDialogOpen = createAction<boolean>("ui/setFindDialogOpen");
export const bumpRefreshNonce = createAction("ui/bumpRefreshNonce");
export const setUpdaterBanner = createAction<UpdaterBannerState | null>("ui/setUpdaterBanner");
export const togglePinnedRepo = createAction<string>("ui/togglePinnedRepo");
export const setPinnedRepos = createAction<string[]>("ui/setPinnedRepos");
export const setSelectedRepo = createAction<string | null>("ui/setSelectedRepo");
export const setOnboardingOverride = createAction<boolean>("ui/setOnboardingOverride");
