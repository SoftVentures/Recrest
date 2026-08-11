import type { AppSettings } from "@recrest/shared";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetSaveSettingsSequence, saveSettings } from "@/store/actions/settings.actions";
import { appSettingsWithIntensity, makeAppSettings } from "@/test/fixtures/appSettings";
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

const appSettings = makeAppSettings;
const withIntensity = appSettingsWithIntensity;

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
    // The dispatch counter is module state; a previous spec's saves would
    // otherwise make this one's first save look superseded.
    resetSaveSettingsSequence();
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

  it("fulfils a superseded save with its own snapshot instead of rejecting", async () => {
    // `.unwrap()` callers (IntegrationsTab, PickFolderStep) roll back and toast
    // on rejection, so a merely-superseded save must resolve. It hands back what
    // the backend answered *it*; keeping the store on the newest value is the
    // reducers' job via `meta.seq`.
    const store = makeTestStore();
    const [first, second] = dragIntensity(store, [10, 90]);

    pendingInvokes[1]?.resolve(withIntensity(90));
    await flush();
    pendingInvokes[0]?.resolve(withIntensity(10));

    const firstResult = await first?.unwrap();
    const secondResult = await second?.unwrap();
    expect(firstResult?.appearance.translucency.intensity).toBe(10);
    expect(secondResult?.appearance.translucency.intensity).toBe(90);
    expect(store.getState().settings.translucency.intensity).toBe(90);
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

  it("keeps B when A→B→C has B land, C fail and A resolve last", async () => {
    // The interleaving the promise-chain guard got wrong: A waited on the newest
    // in-flight save (C), C threw, the `catch { break }` handed back A's own
    // snapshot, and `fulfilled` then rewrote the store from 90 back to 30.
    const store = makeTestStore();
    const [a, b, c] = dragIntensity(store, [30, 60, 90]);

    pendingInvokes[1]?.resolve(withIntensity(60));
    await flush();
    expect(store.getState().settings.translucency.intensity).toBe(60);

    pendingInvokes[2]?.reject(new Error("C boom"));
    await flush();
    pendingInvokes[0]?.resolve(withIntensity(30));
    await flush();

    await expect(c?.unwrap()).rejects.toThrow("C boom");
    expect((await a?.unwrap())?.appearance.translucency.intensity).toBe(30);
    expect((await b?.unwrap())?.appearance.translucency.intensity).toBe(60);
    // B is the newest write that actually landed — A must not undo it.
    expect(store.getState().settings.translucency.intensity).toBe(60);
  });

  it("keeps the newest scan-path list in the repos slice across the same interleaving", async () => {
    const store = makeTestStore();
    const a = store.dispatch(saveSettings({ scanPaths: ["/a"] }));
    const b = store.dispatch(saveSettings({ scanPaths: ["/a", "/b"] }));
    const c = store.dispatch(saveSettings({ scanPaths: ["/a", "/b", "/c"] }));

    pendingInvokes[1]?.resolve(appSettings({ scanPaths: ["/a", "/b"] }));
    await flush();
    pendingInvokes[2]?.reject(new Error("C boom"));
    await flush();
    pendingInvokes[0]?.resolve(appSettings({ scanPaths: ["/a"] }));
    await flush();

    await expect(c.unwrap()).rejects.toThrow("C boom");
    await Promise.all([a, b]);
    expect(store.getState().repos.scanPaths).toEqual(["/a", "/b"]);
  });
});
