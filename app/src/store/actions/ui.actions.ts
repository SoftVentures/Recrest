import { createAction } from "@reduxjs/toolkit";

import type { ActiveView, UpdaterBannerState } from "@/store/types/ui.types";

export const toggleSidebar = createAction("ui/toggleSidebar");

/** Marks a store write as viewport-driven rather than user-driven.
 *  `settingsBackendSync` skips persisting anything carrying it. */
export const TRANSIENT_META = { transient: true } as const;

export interface SidebarCollapsedMeta {
  /** Viewport-driven write — never persisted (see `settingsBackendSync`). */
  transient?: boolean;
  /** The viewport is imposing the collapse. The reducer records this so
   *  settings hydration can't silently undo it. */
  forced?: boolean;
}

export const setSidebarCollapsed = createAction(
  "ui/setSidebarCollapsed",
  (collapsed: boolean, meta: SidebarCollapsedMeta = {}) => ({ payload: collapsed, meta }),
);

/** True for any action stamped with {@link TRANSIENT_META}. `settingsBackendSync`
 *  uses this instead of spelling the meta key out a second time. */
export function isTransientAction(action: unknown): boolean {
  if (typeof action !== "object" || action === null) return false;
  const meta = (action as { meta?: SidebarCollapsedMeta }).meta;
  return meta?.transient === true;
}

/**
 * Collapse/expand the sidebar because the viewport demands it, not because the
 * user asked. Same action type (so every `setSidebarCollapsed.match` consumer
 * keeps working) plus a `transient` meta flag that keeps `settingsBackendSync`
 * from writing it to settings.json — otherwise one narrow session would
 * overwrite the user's real sidebar preference permanently.
 *
 * `forced` separates the two viewport writes: imposing the collapse (`true`)
 * versus releasing it again on a wide window (`false`, payload = the user's
 * stored preference).
 */
export const setSidebarCollapsedAuto = (collapsed: boolean, forced: boolean) =>
  setSidebarCollapsed(collapsed, { ...TRANSIENT_META, forced });
export const setSearchOpen = createAction<boolean>("ui/setSearchOpen");
export const setActiveView = createAction<ActiveView>("ui/setActiveView");
export const setImportDialogOpen = createAction<boolean>("ui/setImportDialogOpen");
export const bumpRefreshNonce = createAction("ui/bumpRefreshNonce");
export const setUpdaterBanner = createAction<UpdaterBannerState | null>("ui/setUpdaterBanner");
export const togglePinnedRepo = createAction<string>("ui/togglePinnedRepo");
export const setPinnedRepos = createAction<string[]>("ui/setPinnedRepos");
export const setSelectedRepo = createAction<string | null>("ui/setSelectedRepo");
export const setOnboardingOverride = createAction<boolean>("ui/setOnboardingOverride");
