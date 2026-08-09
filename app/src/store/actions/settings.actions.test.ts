import type { AppSettings } from "@recrest/shared";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveSettings } from "@/store/actions/settings.actions";
import { makeTestStore } from "@/test/utils";

interface Deferred {
  resolve: (settings: AppSettings) => void;
  reject: (reason: unknown) => void;
}

const pendingInvokes: Deferred[] = [];

vi.mock("@/lib/tauri", () => ({
  isTauri: () => true,
  listen: () => Promise.resolve(() => {}),
  openExternal: () => Promise.resolve(),
  safeInvoke: () => Promise.resolve(null),
  // Hand back a deferred so the test controls the completion ORDER, which is
  // the whole point: `update_settings` responses are not guaranteed to land in
  // dispatch order.
  invoke: () =>
    new Promise<AppSettings>((resolve, reject) => {
      pendingInvokes.push({ resolve, reject });
    }),
}));

function appSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    pollingIntervalMs: 5 * 60_000,
    defaultIde: null,
    theme: "light",
    locale: "en",
    scanPaths: [],
    autoStart: false,
    autoUpdate: "manual",
    startMinimized: false,
    closeToTray: true,
    notifications: { enabled: false, newPr: true, ciFailed: true, mergeReady: true },
    crashReporting: false,
    pinnedRepoIds: [],
    authorAliases: {},
    uiScale: 1,
    repoListViewMode: "grouped",
    repoListSort: { field: "name", direction: "asc" },
    repoImportDefaults: { groupId: null, providerId: null },
    defaultScanPath: null,
    terminal: { id: null, profile: null, customCommand: null },
    shell: null,
    commitMessageTemplate: "",
    privacy: { fetchFavicons: true },
    defaultSshKeyPath: null,
    gitConfigOverride: { userName: null, userEmail: null },
    appearance: {
      themeId: "dark",
      followsSystem: false,
      primaryColor: "blue",
      font: "inter",
      codeFont: "fira-code",
      codeLigatures: "stylistic",
      fontSize: "md",
      translucency: { enabled: true, intensity: 30, blurIntensity: 30 },
      localePrefs: {
        dateFormat: "relative",
        timeFormat: "24h",
        weekStart: "monday",
        region: null,
        timeZone: null,
      },
    },
    accessibility: {
      dyslexiaFont: false,
      highContrast: false,
      reducedMotion: false,
      underlineLinks: false,
    },
    windowState: { sidebarCollapsed: false },
    ...overrides,
  };
}

function withIntensity(intensity: number): AppSettings {
  const base = appSettings();
  return {
    ...base,
    appearance: {
      ...base.appearance,
      translucency: { ...base.appearance.translucency, intensity },
    },
  };
}

/** Slider drag: one `update_settings` per step, all in flight together. */
function dragIntensity(store: ReturnType<typeof makeTestStore>, steps: number[]) {
  return steps.map((intensity) =>
    store.dispatch(saveSettings({ appearance: withIntensity(intensity).appearance })),
  );
}

/** Let every queued `fulfilled` dispatch land before the next response. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("saveSettings ordering guard", () => {
  beforeEach(() => {
    pendingInvokes.length = 0;
  });

  it("does not let a late response rewrite a newer value backwards", async () => {
    const store = makeTestStore();
    const saves = dragIntensity(store, [40, 60, 80]);
    expect(pendingInvokes).toHaveLength(3);

    // The newest write lands first, the two older ones straggle in afterwards.
    pendingInvokes[2]?.resolve(withIntensity(80));
    await flush();
    expect(store.getState().settings.translucency.intensity).toBe(80);

    pendingInvokes[0]?.resolve(withIntensity(40));
    await flush();
    pendingInvokes[1]?.resolve(withIntensity(60));
    await Promise.all(saves);

    expect(store.getState().settings.translucency.intensity).toBe(80);
  });

  it("fulfils a superseded save with the newest snapshot", async () => {
    const store = makeTestStore();
    const [first, second] = dragIntensity(store, [10, 90]);

    pendingInvokes[1]?.resolve(withIntensity(90));
    await flush();
    pendingInvokes[0]?.resolve(withIntensity(10));

    const firstResult = await first?.unwrap();
    const secondResult = await second?.unwrap();
    expect(firstResult?.appearance.translucency.intensity).toBe(90);
    expect(secondResult?.appearance.translucency.intensity).toBe(90);
  });

  it("keeps the newest pinned repo list when saves complete out of order", async () => {
    const store = makeTestStore();
    const first = store.dispatch(saveSettings({ pinnedRepoIds: ["r1"] }));
    const second = store.dispatch(saveSettings({ pinnedRepoIds: ["r1", "r2"] }));

    pendingInvokes[1]?.resolve(appSettings({ pinnedRepoIds: ["r1", "r2"] }));
    await flush();
    pendingInvokes[0]?.resolve(appSettings({ pinnedRepoIds: ["r1"] }));
    await Promise.all([first, second]);

    expect(store.getState().ui.pinnedRepoIds).toEqual(["r1", "r2"]);
  });

  it("fulfils a lone save with its own snapshot", async () => {
    const store = makeTestStore();
    const save = store.dispatch(saveSettings({ appearance: withIntensity(55).appearance }));

    pendingInvokes[0]?.resolve(withIntensity(55));

    expect((await save.unwrap()).appearance.translucency.intensity).toBe(55);
    expect(store.getState().settings.translucency.intensity).toBe(55);
  });

  it("still rejects when the backend write fails", async () => {
    const store = makeTestStore();
    const save = store.dispatch(saveSettings({ locale: "de" }));

    pendingInvokes[0]?.reject(new Error("update_settings boom"));

    await expect(save.unwrap()).rejects.toThrow("update_settings boom");
  });

  it("keeps a landed write's own snapshot when a newer save fails", async () => {
    const store = makeTestStore();
    const first = store.dispatch(saveSettings({ appearance: withIntensity(25).appearance }));
    const second = store.dispatch(saveSettings({ appearance: withIntensity(75).appearance }));

    pendingInvokes[1]?.reject(new Error("boom"));
    await flush();
    pendingInvokes[0]?.resolve(withIntensity(25));

    await expect(second.unwrap()).rejects.toThrow("boom");
    expect((await first.unwrap()).appearance.translucency.intensity).toBe(25);
  });
});
