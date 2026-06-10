import type { AppSettings } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { loadSettings, saveSettings } from "@/store/actions/settings.actions";
import {
  bumpRefreshNonce,
  setActiveView,
  setFindDialogOpen,
  setImportDialogOpen,
  setOnboardingOverride,
  setPinnedRepos,
  setSearchOpen,
  setSelectedRepo,
  setSidebarCollapsed,
  setUpdaterBanner,
  togglePinnedRepo,
  toggleSidebar,
} from "@/store/actions/ui.actions";
import { uiReducer } from "@/store/reducers/uiReducer";
import type { UiState } from "@/store/types/ui.types";

// The reducer keeps `initialState` private, so derive it the canonical RTK way.
const initial = (): UiState => uiReducer(undefined, { type: "@@INIT" });

describe("uiReducer", () => {
  it("toggles the sidebar", () => {
    const next = uiReducer(initial(), toggleSidebar());
    expect(next.sidebarCollapsed).toBe(true);
    expect(uiReducer(next, toggleSidebar()).sidebarCollapsed).toBe(false);
  });

  it("sets the sidebar collapsed flag explicitly", () => {
    const next = uiReducer(initial(), setSidebarCollapsed(true));
    expect(next.sidebarCollapsed).toBe(true);
  });

  it("sets the search open flag", () => {
    const next = uiReducer(initial(), setSearchOpen(true));
    expect(next.searchOpen).toBe(true);
  });

  it("sets the active view", () => {
    const next = uiReducer(initial(), setActiveView("settings"));
    expect(next.activeView).toBe("settings");
  });

  it("sets the import dialog open flag", () => {
    const next = uiReducer(initial(), setImportDialogOpen(true));
    expect(next.importDialogOpen).toBe(true);
  });

  it("sets the find dialog open flag", () => {
    const next = uiReducer(initial(), setFindDialogOpen(true));
    expect(next.findDialogOpen).toBe(true);
  });

  it("bumps the refresh nonce", () => {
    const next = uiReducer(initial(), bumpRefreshNonce());
    expect(next.refreshNonce).toBe(1);
    expect(uiReducer(next, bumpRefreshNonce()).refreshNonce).toBe(2);
  });

  it("sets and clears the updater banner", () => {
    const banner = {
      version: "1.2.3",
      body: null,
      canAutoInstall: true,
      downloadUrl: null,
    };
    const next = uiReducer(initial(), setUpdaterBanner(banner));
    expect(next.updaterBanner).toEqual(banner);
    expect(uiReducer(next, setUpdaterBanner(null)).updaterBanner).toBeNull();
  });

  it("toggles a pinned repo id on and off", () => {
    const afterPin = uiReducer(initial(), togglePinnedRepo("repo-1"));
    expect(afterPin.pinnedRepoIds).toEqual(["repo-1"]);
    const afterUnpin = uiReducer(afterPin, togglePinnedRepo("repo-1"));
    expect(afterUnpin.pinnedRepoIds).toEqual([]);
  });

  it("replaces the pinned repo list", () => {
    const next = uiReducer(initial(), setPinnedRepos(["a", "b"]));
    expect(next.pinnedRepoIds).toEqual(["a", "b"]);
  });

  it("sets the selected repo and clears it with null", () => {
    const next = uiReducer(initial(), setSelectedRepo("repo-9"));
    expect(next.selectedRepoId).toBe("repo-9");
    expect(uiReducer(next, setSelectedRepo(null)).selectedRepoId).toBeNull();
  });

  it("sets the onboarding override flag", () => {
    const next = uiReducer(initial(), setOnboardingOverride(true));
    expect(next.onboardingOverride).toBe(true);
  });

  it("hydrates pinned repos and sidebar state from loadSettings.fulfilled", () => {
    const payload = {
      pinnedRepoIds: ["x", "y"],
      windowState: { sidebarCollapsed: true },
    } as unknown as AppSettings;
    const next = uiReducer(initial(), loadSettings.fulfilled(payload, "internal-id", undefined));
    expect(next.pinnedRepoIds).toEqual(["x", "y"]);
    expect(next.sidebarCollapsed).toBe(true);
  });

  it("filters non-string pinned repo ids during hydration", () => {
    const payload = {
      pinnedRepoIds: ["ok", 42, null, "fine"],
    } as unknown as AppSettings;
    const next = uiReducer(initial(), loadSettings.fulfilled(payload, "internal-id", undefined));
    expect(next.pinnedRepoIds).toEqual(["ok", "fine"]);
  });

  it("leaves session state untouched when the backend payload omits the fields", () => {
    const start = uiReducer(initial(), setPinnedRepos(["keep"]));
    const collapsed = uiReducer(start, setSidebarCollapsed(true));
    const payload = {} as unknown as AppSettings;
    const next = uiReducer(collapsed, saveSettings.fulfilled(payload, "internal-id", {}));
    expect(next.pinnedRepoIds).toEqual(["keep"]);
    expect(next.sidebarCollapsed).toBe(true);
  });

  it("hydrates from saveSettings.fulfilled too", () => {
    const payload = {
      pinnedRepoIds: ["saved"],
      windowState: { sidebarCollapsed: false },
    } as unknown as AppSettings;
    const next = uiReducer(
      uiReducer(initial(), setSidebarCollapsed(true)),
      saveSettings.fulfilled(payload, "internal-id", {}),
    );
    expect(next.pinnedRepoIds).toEqual(["saved"]);
    expect(next.sidebarCollapsed).toBe(false);
  });
});
