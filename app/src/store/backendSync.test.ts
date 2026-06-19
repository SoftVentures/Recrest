import { configureStore } from "@reduxjs/toolkit";

import { TauriCommand } from "@recrest/shared";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  setCodeFont,
  setCodeLigatures,
  setCrashReporting,
  setDesktopAutoStart,
  setDesktopCloseToTray,
  setDesktopStartMinimized,
  setDyslexiaFont,
  setFollowsSystem,
  setFont,
  setFontSize,
  setHighContrast,
  setLocale,
  setNotificationsCiFailed,
  setNotificationsEnabled,
  setNotificationsMergeReady,
  setNotificationsNewPr,
  setPollingIntervalMinutes,
  setPrimaryColor,
  setReducedMotion,
  setThemeId,
  setUnderlineLinks,
  setUpdateMode,
} from "@/store/actions/settings.actions";
import {
  setPinnedRepos,
  setSidebarCollapsed,
  togglePinnedRepo,
  toggleSidebar,
} from "@/store/actions/ui.actions";
import { settingsBackendSync } from "@/store/backendSync";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { uiReducer } from "@/store/reducers/uiReducer";

// `isTauri` must be true so the middleware doesn't bail at the top, and
// `invoke` is the spy we assert against — every `saveSettings(...)` dispatched
// by the middleware ends up calling `invoke(UPDATE_SETTINGS, { patch })`.
// `invoke` returns a never-settling promise: we only assert that the
// middleware *called* it with the right `update_settings` patch. Letting the
// `saveSettings` thunk reach `fulfilled` would feed the reducer a partial
// payload it can't merge — and that path is already covered by the reducer's
// own tests.
const { invokeMock, isTauriMock } = vi.hoisted(() => ({
  invokeMock: vi.fn((..._args: unknown[]) => new Promise<unknown>(() => {})),
  isTauriMock: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/tauri", () => ({
  invoke: invokeMock,
  isTauri: isTauriMock,
}));

// The autostart toggle dynamically imports this plugin; stub it so the
// fire-and-forget side effect resolves cleanly under jsdom.
const { isEnabledMock, enableMock, disableMock } = vi.hoisted(() => ({
  isEnabledMock: vi.fn().mockResolvedValue(false),
  enableMock: vi.fn().mockResolvedValue(undefined),
  disableMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  isEnabled: isEnabledMock,
  enable: enableMock,
  disable: disableMock,
}));

function makeStore() {
  return configureStore({
    reducer: { settings: settingsReducer, ui: uiReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(settingsBackendSync),
  });
}

/** The last `update_settings` patch the middleware sent to the backend. */
function lastPatch(): Record<string, unknown> {
  const calls = invokeMock.mock.calls.filter((c) => c[0] === TauriCommand.UPDATE_SETTINGS);
  expect(calls.length).toBeGreaterThan(0);
  const last = calls[calls.length - 1] as unknown[];
  return (last[1] as { patch: Record<string, unknown> }).patch;
}

describe("settingsBackendSync", () => {
  beforeEach(() => {
    invokeMock.mockClear();
    isTauriMock.mockReturnValue(true);
    isEnabledMock.mockClear();
    enableMock.mockClear();
    disableMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing outside Tauri", () => {
    isTauriMock.mockReturnValue(false);
    const store = makeStore();
    store.dispatch(setHighContrast(true));
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("ignores non-settings, non-persisted-ui actions", () => {
    const store = makeStore();
    store.dispatch({ type: "repos/upsertRepo", payload: { id: "x" } });
    expect(invokeMock.mock.calls.filter((c) => c[0] === TauriCommand.UPDATE_SETTINGS)).toHaveLength(
      0,
    );
  });

  it("ignores actions whose type is not a settings/persisted-ui prefix", () => {
    const store = makeStore();
    store.dispatch({ type: "prs/clearPrs", payload: "repo-1" });
    expect(invokeMock.mock.calls.filter((c) => c[0] === TauriCommand.UPDATE_SETTINGS)).toHaveLength(
      0,
    );
  });

  it("does not re-fire on the thunk's own syncSystemTheme action", () => {
    const store = makeStore();
    store.dispatch({ type: "settings/syncSystemTheme", payload: "dark" });
    expect(invokeMock.mock.calls.filter((c) => c[0] === TauriCommand.UPDATE_SETTINGS)).toHaveLength(
      0,
    );
  });

  it("converts polling minutes to milliseconds", () => {
    const store = makeStore();
    store.dispatch(setPollingIntervalMinutes(3));
    expect(lastPatch()).toEqual({ pollingIntervalMs: 3 * 60_000 });
  });

  it("writes both the legacy theme slot and appearance on setThemeId", () => {
    const store = makeStore();
    store.dispatch(setThemeId("dark"));
    const patch = lastPatch();
    expect(patch.theme).toBe("dark");
    expect(patch.appearance).toMatchObject({ themeId: "dark", followsSystem: false });
  });

  it("maps light themeId straight through", () => {
    const store = makeStore();
    store.dispatch(setThemeId("light"));
    expect(lastPatch().theme).toBe("light");
  });

  it("writes theme=system when follows-system is enabled", () => {
    const store = makeStore();
    store.dispatch(setFollowsSystem(true));
    const patch = lastPatch();
    expect(patch.theme).toBe("system");
    expect(patch.appearance).toMatchObject({ followsSystem: true });
  });

  it("writes the resolved themeId when follows-system is disabled", () => {
    const store = makeStore();
    store.dispatch(setFollowsSystem(false));
    const patch = lastPatch();
    expect(["light", "dark"]).toContain(patch.theme);
    expect(patch.appearance).toMatchObject({ followsSystem: false });
  });

  it("syncs primary color", () => {
    const store = makeStore();
    store.dispatch(setPrimaryColor("blue"));
    expect((lastPatch().appearance as Record<string, unknown>).primaryColor).toBe("blue");
  });

  it("derives dyslexiaFont accessibility flag from the chosen font", () => {
    const store = makeStore();
    store.dispatch(setFont("opendyslexic"));
    const patch = lastPatch();
    expect((patch.appearance as Record<string, unknown>).font).toBe("opendyslexic");
    expect((patch.accessibility as Record<string, unknown>).dyslexiaFont).toBe(true);
  });

  it("syncs the code font", () => {
    const store = makeStore();
    store.dispatch(setCodeFont("fira-code"));
    expect((lastPatch().appearance as Record<string, unknown>).codeFont).toBe("fira-code");
  });

  it("syncs code ligatures", () => {
    const store = makeStore();
    store.dispatch(setCodeLigatures("off"));
    expect((lastPatch().appearance as Record<string, unknown>).codeLigatures).toBe("off");
  });

  it("syncs font size", () => {
    const store = makeStore();
    store.dispatch(setFontSize("lg"));
    expect((lastPatch().appearance as Record<string, unknown>).fontSize).toBe("lg");
  });

  it("maps the dyslexiaFont toggle onto both font and accessibility", () => {
    const store = makeStore();
    store.dispatch(setDyslexiaFont(true));
    const patch = lastPatch();
    expect((patch.appearance as Record<string, unknown>).font).toBe("opendyslexic");
    expect((patch.accessibility as Record<string, unknown>).dyslexiaFont).toBe(true);

    store.dispatch(setDyslexiaFont(false));
    expect((lastPatch().appearance as Record<string, unknown>).font).toBe("inter");
  });

  it("syncs the high-contrast accessibility flag", () => {
    const store = makeStore();
    store.dispatch(setHighContrast(true));
    expect((lastPatch().accessibility as Record<string, unknown>).highContrast).toBe(true);
  });

  it("syncs the reduced-motion accessibility flag", () => {
    const store = makeStore();
    store.dispatch(setReducedMotion(true));
    expect((lastPatch().accessibility as Record<string, unknown>).reducedMotion).toBe(true);
  });

  it("syncs the underline-links accessibility flag", () => {
    const store = makeStore();
    store.dispatch(setUnderlineLinks(true));
    expect((lastPatch().accessibility as Record<string, unknown>).underlineLinks).toBe(true);
  });

  it("persists an explicit sidebar collapsed value", () => {
    const store = makeStore();
    store.dispatch(setSidebarCollapsed(true));
    expect(lastPatch()).toMatchObject({ windowState: { sidebarCollapsed: true } });
  });

  it("reads the freshly toggled sidebar value off state", () => {
    const store = makeStore();
    const before = store.getState().ui.sidebarCollapsed;
    store.dispatch(toggleSidebar());
    expect(lastPatch()).toMatchObject({ windowState: { sidebarCollapsed: !before } });
  });

  it("persists pinned repos on toggle", () => {
    const store = makeStore();
    store.dispatch(togglePinnedRepo("repo-1"));
    expect(lastPatch().pinnedRepoIds).toEqual(store.getState().ui.pinnedRepoIds);
  });

  it("persists pinned repos on set", () => {
    const store = makeStore();
    store.dispatch(setPinnedRepos(["a", "b"]));
    expect(lastPatch().pinnedRepoIds).toEqual(["a", "b"]);
  });

  it("syncs locale", () => {
    const store = makeStore();
    store.dispatch(setLocale("de"));
    expect(lastPatch()).toEqual({ locale: "de" });
  });

  it("persists autostart and enables the OS plugin", async () => {
    isEnabledMock.mockResolvedValue(false);
    const store = makeStore();
    store.dispatch(setDesktopAutoStart(true));
    expect(lastPatch()).toEqual({ autoStart: true });
    await vi.waitFor(() => expect(enableMock).toHaveBeenCalled());
  });

  it("disables the OS autostart plugin when toggled off", async () => {
    isEnabledMock.mockResolvedValue(true);
    const store = makeStore();
    store.dispatch(setDesktopAutoStart(false));
    expect(lastPatch()).toEqual({ autoStart: false });
    await vi.waitFor(() => expect(disableMock).toHaveBeenCalled());
  });

  it("syncs startMinimized", () => {
    const store = makeStore();
    store.dispatch(setDesktopStartMinimized(true));
    expect(lastPatch()).toEqual({ startMinimized: true });
  });

  it("syncs closeToTray", () => {
    const store = makeStore();
    store.dispatch(setDesktopCloseToTray(true));
    expect(lastPatch()).toEqual({ closeToTray: true });
  });

  it("syncs crash reporting", () => {
    const store = makeStore();
    store.dispatch(setCrashReporting(true));
    expect(lastPatch()).toEqual({ crashReporting: true });
  });

  it("sends the full notification bag on each notification toggle", () => {
    const store = makeStore();
    store.dispatch(setNotificationsEnabled(false));
    expect((lastPatch().notifications as Record<string, unknown>).enabled).toBe(false);

    store.dispatch(setNotificationsNewPr(false));
    expect((lastPatch().notifications as Record<string, unknown>).newPr).toBe(false);

    store.dispatch(setNotificationsCiFailed(false));
    expect((lastPatch().notifications as Record<string, unknown>).ciFailed).toBe(false);

    store.dispatch(setNotificationsMergeReady(false));
    expect((lastPatch().notifications as Record<string, unknown>).mergeReady).toBe(false);
  });

  it("syncs the auto-update mode", () => {
    const store = makeStore();
    store.dispatch(setUpdateMode("manual"));
    expect(lastPatch()).toEqual({ autoUpdate: "manual" });
  });
});
