import type { ReactNode } from "react";

import { Provider as ReduxProvider } from "react-redux";

import type { UnknownAction } from "@reduxjs/toolkit";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useResponsiveSidebar } from "@/hooks/useResponsiveSidebar";
import { loadSettings, saveSettings } from "@/store/actions/settings.actions";
import { setSidebarCollapsed } from "@/store/actions/ui.actions";
import { makeAppSettings } from "@/test/fixtures/appSettings";
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

  it("survives settings hydration landing after the forced collapse", () => {
    // The regression this guards: `hydrateUiFromBackend` re-applied the stored
    // (manual) preference on `loadSettings.fulfilled`, which is `false` by
    // default. On a 1100–1199px window that expanded the sidebar right back and
    // the viewport class never changed again, so nothing re-collapsed it for the
    // rest of the session.
    const { store } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);
    expect(store.getState().ui.sidebarCollapsed).toBe(true);

    act(() => {
      store.dispatch(
        loadSettings.fulfilled(
          makeAppSettings({ windowState: { sidebarCollapsed: false } }),
          "internal-id",
          undefined,
        ),
      );
    });

    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  it("survives any settings save while the window is narrow", () => {
    // Same defect via the other hydration entry point: a theme toggle, a slider
    // drag or a pin toggle all resolve `saveSettings.fulfilled`.
    const { store } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);

    act(() => {
      store.dispatch(
        saveSettings.fulfilled(
          makeAppSettings({ windowState: { sidebarCollapsed: false } }),
          "internal-id",
          {},
          { seq: 1 },
        ),
      );
    });

    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  it("restores a preference that only arrived via hydration once the window widens", () => {
    const { store } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);

    act(() => {
      store.dispatch(
        loadSettings.fulfilled(
          makeAppSettings({ windowState: { sidebarCollapsed: true } }),
          "internal-id",
          undefined,
        ),
      );
    });
    act(() => setViewportWidth(ROOMY_WIDTH));

    // The hydrated preference wins, not the pre-hydration default.
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
  });

  it("lets the user expand the sidebar while the window is still narrow", () => {
    const { store } = makeRecordingStore(false);
    setViewportWidth(COMPACT_WIDTH);
    renderSidebarHook(store);
    expect(store.getState().ui.sidebarCollapsed).toBe(true);

    act(() => {
      store.dispatch(setSidebarCollapsed(false));
    });

    // The effect now re-runs on every `collapsed` change (that is what makes it
    // immune to hydration), so it must not fight the toggle.
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
