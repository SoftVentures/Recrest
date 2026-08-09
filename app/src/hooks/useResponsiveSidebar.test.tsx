import type { ReactNode } from "react";

import { Provider as ReduxProvider } from "react-redux";

import type { UnknownAction } from "@reduxjs/toolkit";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useResponsiveSidebar } from "@/hooks/useResponsiveSidebar";
import { setSidebarCollapsed } from "@/store/actions/ui.actions";
import { makeTestStore } from "@/test/utils";

const device = { isMobile: false, isTablet: false, isDesktop: true };
vi.mock("@/hooks/useDevice", () => ({ useDevice: () => device }));

/** Recrest is desktop-only with a 1100×720 minimum window, so the only
 *  responsive transition that exists in practice is compact-desktop
 *  (<1200px) ↔ roomy-desktop. Mobile/tablet never happen. */
const COMPACT_WIDTH = 1150;
const ROOMY_WIDTH = 1440;

const changeListeners = new Set<() => void>();
let compact = false;

function setViewportWidth(width: number) {
  compact = width < 1200;
  for (const listener of [...changeListeners]) listener();
}

beforeEach(() => {
  compact = false;
  changeListeners.clear();
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        media: query,
        get matches() {
          return compact;
        },
        addEventListener: (_: string, cb: () => void) => changeListeners.add(cb),
        removeEventListener: (_: string, cb: () => void) => changeListeners.delete(cb),
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }) as unknown as MediaQueryList,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Store whose dispatched actions are recorded, so a test can assert whether a
 *  write was marked `transient` (i.e. skipped by `settingsBackendSync`). */
function makeRecordingStore(sidebarCollapsed = false) {
  const store = makeTestStore({ ui: { sidebarCollapsed } });
  const actions: UnknownAction[] = [];
  const original = store.dispatch;
  store.dispatch = ((action: UnknownAction) => {
    actions.push(action);
    return original(action);
  }) as typeof store.dispatch;
  return { store, actions };
}

function renderSidebarHook(store: ReturnType<typeof makeRecordingStore>["store"]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ReduxProvider store={store}>{children}</ReduxProvider>
  );
  return renderHook(() => useResponsiveSidebar(), { wrapper });
}

describe("useResponsiveSidebar", () => {
  it("collapses automatically on a compact desktop viewport", () => {
    const { store } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  it("marks the automatic collapse transient so it is never persisted", () => {
    const { store, actions } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);
    const writes = actions.filter((a) => setSidebarCollapsed.match(a));
    expect(writes).toHaveLength(1);
    expect((writes[0] as { meta?: { transient?: boolean } }).meta?.transient).toBe(true);
  });

  it("restores the expanded preference when the window widens again", () => {
    const { store } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);
    expect(store.getState().ui.sidebarCollapsed).toBe(true);

    act(() => setViewportWidth(ROOMY_WIDTH));
    expect(store.getState().ui.sidebarCollapsed).toBe(false);
  });

  it("keeps a collapse the user performed themselves across a widen", () => {
    const { store } = makeRecordingStore(false);
    renderSidebarHook(store);
    act(() => {
      store.dispatch(setSidebarCollapsed(true));
    });

    act(() => setViewportWidth(COMPACT_WIDTH));
    act(() => setViewportWidth(ROOMY_WIDTH));
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  it("does not touch the sidebar when the viewport was never narrow", () => {
    const { store, actions } = makeRecordingStore(false);
    renderSidebarHook(store);
    act(() => setViewportWidth(ROOMY_WIDTH));
    expect(actions.filter((a) => setSidebarCollapsed.match(a))).toHaveLength(0);
    expect(store.getState().ui.sidebarCollapsed).toBe(false);
  });

  it("expands again after a narrow boot, instead of staying collapsed forever", () => {
    // The regression: booting narrow used to persist `collapsed: true`, so the
    // next cold start hydrated collapsed, the auto-collapse branch never fired,
    // and widening had nothing to restore.
    const { store, actions } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);
    act(() => setViewportWidth(ROOMY_WIDTH));

    expect(store.getState().ui.sidebarCollapsed).toBe(false);
    expect(
      actions
        .filter((a) => setSidebarCollapsed.match(a))
        .every((a) => (a as { meta?: { transient?: boolean } }).meta?.transient === true),
    ).toBe(true);
  });
});
