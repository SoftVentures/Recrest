import { describe, expect, it } from "vitest";

import {
  setActiveView,
  setSearchOpen,
  setSelectedRepo,
  setSidebarCollapsed,
  toggleSidebar,
  uiReducer,
} from "@/store/slices/uiSlice";

describe("uiSlice", () => {
  const initial = uiReducer(undefined, { type: "@@INIT" });

  it("toggles sidebar collapsed state", () => {
    const next = uiReducer(initial, toggleSidebar());
    expect(next.sidebarCollapsed).toBe(!initial.sidebarCollapsed);
  });

  it("sets sidebar collapsed explicitly", () => {
    const next = uiReducer(initial, setSidebarCollapsed(true));
    expect(next.sidebarCollapsed).toBe(true);
  });

  it("opens and closes search", () => {
    let state = uiReducer(initial, setSearchOpen(true));
    expect(state.searchOpen).toBe(true);
    state = uiReducer(state, setSearchOpen(false));
    expect(state.searchOpen).toBe(false);
  });

  it("tracks the active view", () => {
    const next = uiReducer(initial, setActiveView("merge-requests"));
    expect(next.activeView).toBe("merge-requests");
  });

  it("updates the selected repo id", () => {
    const next = uiReducer(initial, setSelectedRepo("repo-42"));
    expect(next.selectedRepoId).toBe("repo-42");
  });
});
