import { configureStore } from "@reduxjs/toolkit";

import { type AppSettings, type FontSizeId, StorageKey, TauriCommand } from "@recrest/shared";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadSettings, setUiScale } from "@/store/actions/settings.actions";
import { settingsReducer } from "@/store/reducers/settingsReducer";
import { loadUiScaleMigrated, uiScaleMigrationMiddleware } from "@/store/uiScaleMigration";
import { makeAppSettings } from "@/test/fixtures/appSettings";

const { invokeMock, isTauriMock } = vi.hoisted(() => ({
  invokeMock: vi.fn((..._args: unknown[]) => new Promise<unknown>(() => {})),
  isTauriMock: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/tauri", () => ({
  invoke: invokeMock,
  isTauri: isTauriMock,
}));

/** Stands in for `settings.json`: `update_settings` merges the patch and hands
 *  the merged snapshot back, exactly like the Rust command. */
let backend: AppSettings;

function makeStore() {
  return configureStore({
    reducer: { settings: settingsReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(uiScaleMigrationMiddleware),
  });
}

function withFontSize(fontSize: FontSizeId, uiScale: number): AppSettings {
  const base = makeAppSettings({ uiScale });
  return { ...base, appearance: { ...base.appearance, fontSize } };
}

function savedPatches(): Record<string, unknown>[] {
  return invokeMock.mock.calls
    .filter((c) => c[0] === TauriCommand.UPDATE_SETTINGS)
    .map((c) => (c[1] as { patch: Record<string, unknown> }).patch);
}

describe("uiScaleMigrationMiddleware", () => {
  beforeEach(() => {
    localStorage.clear();
    backend = withFontSize("md", 1);
    invokeMock.mockReset();
    invokeMock.mockImplementation((cmd: unknown, args?: unknown) => {
      if (cmd !== TauriCommand.UPDATE_SETTINGS) return new Promise<unknown>(() => {});
      const { patch } = args as { patch: Partial<AppSettings> };
      backend = { ...backend, ...patch };
      return Promise.resolve(backend);
    });
  });

  it("writes the migrated scale back to the backend and marks the migration done", async () => {
    backend = withFontSize("lg", 1);
    const store = makeStore();
    store.dispatch(loadSettings.fulfilled(backend, "id", undefined));

    expect(store.getState().settings.uiScale).toBe(1.1);
    await vi.waitFor(() => expect(savedPatches()).toEqual([{ uiScale: 1.1 }]));
    await vi.waitFor(() => expect(localStorage.getItem(StorageKey.UI_SCALE_MIGRATED)).toBe("true"));
    expect(backend.uiScale).toBe(1.1);
  });

  it("keeps the marker unset when the backend write fails, so the next boot retries", async () => {
    backend = withFontSize("xl", 1);
    invokeMock.mockImplementation(() => Promise.reject(new Error("disk full")));
    const store = makeStore();
    store.dispatch(loadSettings.fulfilled(backend, "id", undefined));

    expect(store.getState().settings.uiScale).toBe(1.25);
    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalled());
    await Promise.resolve();
    expect(localStorage.getItem(StorageKey.UI_SCALE_MIGRATED)).toBeNull();
  });

  it("marks a default install migrated without touching the backend", async () => {
    const store = makeStore();
    store.dispatch(loadSettings.fulfilled(backend, "id", undefined));

    expect(store.getState().settings.uiScale).toBe(1);
    expect(localStorage.getItem(StorageKey.UI_SCALE_MIGRATED)).toBe("true");
    await Promise.resolve();
    expect(savedPatches()).toEqual([]);
  });

  it("fires exactly once per install, not once per load", async () => {
    backend = withFontSize("xl", 1);
    const store = makeStore();
    store.dispatch(loadSettings.fulfilled(backend, "id", undefined));
    await vi.waitFor(() => expect(savedPatches()).toHaveLength(1));

    store.dispatch(loadSettings.fulfilled(backend, "id", undefined));
    store.dispatch(loadSettings.fulfilled(backend, "id", undefined));
    await Promise.resolve();

    expect(savedPatches()).toEqual([{ uiScale: 1.25 }]);
    expect(store.getState().settings.uiScale).toBe(1.25);
  });

  it("marks the migration done when the user picks a scale first", () => {
    const store = makeStore();
    store.dispatch(setUiScale(1));

    expect(localStorage.getItem(StorageKey.UI_SCALE_MIGRATED)).toBe("true");
    // Persisting the choice itself is `settingsBackendSync`'s job, not ours.
    expect(savedPatches()).toEqual([]);

    store.dispatch(loadSettings.fulfilled(withFontSize("lg", 1), "id", undefined));
    expect(store.getState().settings.uiScale).toBe(1);
  });

  it("reads the persisted marker back", () => {
    expect(loadUiScaleMigrated()).toBe(false);
    localStorage.setItem(StorageKey.UI_SCALE_MIGRATED, "true");
    expect(loadUiScaleMigrated()).toBe(true);
  });

  it("starts an already-migrated session migrated, so a restart never re-runs it", async () => {
    localStorage.setItem(StorageKey.UI_SCALE_MIGRATED, "true");
    vi.resetModules();
    const { settingsReducer: freshReducer } = await import("@/store/reducers/settingsReducer");
    const { loadSettings: freshLoad } = await import("@/store/actions/settings.actions");

    const boot = freshReducer(undefined, { type: "@@INIT" });
    expect(boot.uiScaleMigrated).toBe(true);
    const next = freshReducer(boot, freshLoad.fulfilled(withFontSize("lg", 1), "id", undefined));
    expect(next.uiScale).toBe(1);
  });
});
